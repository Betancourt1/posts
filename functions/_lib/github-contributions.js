const CONTRIBUTION_LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const WALL_WEEKS = 104;

const CONTRIBUTIONS_QUERY = `
  query ContributionCalendar(
    $login: String!
    $earlierFrom: DateTime!
    $earlierTo: DateTime!
    $recentFrom: DateTime!
    $recentTo: DateTime!
  ) {
    user(login: $login) {
      earlier: contributionsCollection(from: $earlierFrom, to: $earlierTo) {
        ...CalendarFields
      }
      recent: contributionsCollection(from: $recentFrom, to: $recentTo) {
        ...CalendarFields
      }
    }
  }

  fragment CalendarFields on ContributionsCollection {
    contributionCalendar {
      totalContributions
      months {
        firstDay
      }
      weeks {
        contributionDays {
          contributionCount
          contributionLevel
          date
          weekday
        }
      }
    }
  }
`;

function requiredToken(env) {
  const token = String(env.GITHUB_TOKEN || "").trim();

  if (!token) {
    const error = new Error("GitHub contributions are not configured.");
    error.status = 503;
    throw error;
  }

  return token;
}

function monthColumn(firstDate, monthDate) {
  const millisecondsPerWeek = 7 * DAY_IN_MILLISECONDS;
  return Math.floor((Date.parse(monthDate) - Date.parse(firstDate)) / millisecondsPerWeek) + 1;
}

export function contributionRanges(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  const latestSunday = new Date(Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate() - end.getUTCDay(),
  ));
  const earlierFrom = new Date(latestSunday.getTime() - (WALL_WEEKS * 7 * DAY_IN_MILLISECONDS));
  const recentFrom = new Date(earlierFrom);
  recentFrom.setUTCFullYear(recentFrom.getUTCFullYear() + 1);
  const earlierTo = new Date(recentFrom.getTime() - 1);

  return {
    earlierFrom: earlierFrom.toISOString(),
    earlierTo: earlierTo.toISOString(),
    recentFrom: recentFrom.toISOString(),
    recentTo: end.toISOString(),
  };
}

export function normalizeContributionCalendars(username, calendars) {
  const daysByDate = new Map();

  calendars.forEach((calendar) => {
    (calendar.weeks || [])
      .flatMap((week) => week.contributionDays || [])
      .forEach((day) => {
        daysByDate.set(day.date, {
          date: day.date,
          count: day.contributionCount,
          level: CONTRIBUTION_LEVELS[day.contributionLevel] ?? 0,
          weekday: day.weekday,
        });
      });
  });

  const days = [...daysByDate.values()].sort((left, right) => left.date.localeCompare(right.date));

  if (!days.length) {
    throw new Error("GitHub returned an empty contribution calendar.");
  }

  const firstDate = days[0].date;
  const lastDate = days[days.length - 1].date;
  const weekCount = Math.ceil(days.length / 7);
  const monthDates = new Set(calendars.flatMap((calendar) => (
    (calendar.months || []).map((month) => month.firstDay)
  )));
  const months = [...monthDates]
    .sort()
    .map((month) => ({
      firstDay: month,
      column: monthColumn(firstDate, month),
    }))
    .filter((month) => month.column >= 1 && month.column <= weekCount);

  return {
    username,
    totalContributions: calendars.reduce((total, calendar) => total + calendar.totalContributions, 0),
    startDate: firstDate,
    endDate: lastDate,
    weekCount,
    months,
    days,
  };
}

export function normalizeContributionCalendar(username, calendar) {
  return normalizeContributionCalendars(username, [calendar]);
}

export async function fetchGitHubContributions(env, now = new Date()) {
  const username = String(env.GITHUB_USERNAME || env.GITHUB_OWNER || "Betancourt1").trim();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${requiredToken(env)}`,
      "Content-Type": "application/json",
      "User-Agent": "posts-code-portfolio",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: username, ...contributionRanges(now) },
    }),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const error = new Error(payload.errors?.[0]?.message || `GitHub API error ${response.status}.`);
    error.status = response.ok ? 502 : response.status;
    throw error;
  }

  if (!payload.data?.user) {
    const error = new Error(`GitHub user ${username} was not found.`);
    error.status = 404;
    throw error;
  }

  const calendars = [
    payload.data.user.earlier?.contributionCalendar,
    payload.data.user.recent?.contributionCalendar,
  ].filter(Boolean);

  if (calendars.length !== 2) {
    const error = new Error("GitHub returned an incomplete contribution history.");
    error.status = 502;
    throw error;
  }

  return normalizeContributionCalendars(username, calendars);
}
