const CONTRIBUTION_LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CONTRIBUTIONS_QUERY = `
  query ContributionCalendar($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          months {
            firstDay
            name
            totalWeeks
            year
          }
          weeks {
            firstDay
            contributionDays {
              contributionCount
              contributionLevel
              date
              weekday
            }
          }
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
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((Date.parse(monthDate) - Date.parse(firstDate)) / millisecondsPerWeek) + 1;
}

export function normalizeContributionCalendar(username, calendar) {
  const days = (calendar.weeks || [])
    .flatMap((week) => week.contributionDays || [])
    .map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: CONTRIBUTION_LEVELS[day.contributionLevel] ?? 0,
      weekday: day.weekday,
    }));

  if (!days.length) {
    throw new Error("GitHub returned an empty contribution calendar.");
  }

  const firstDate = days[0].date;
  const lastDate = days[days.length - 1].date;
  const months = (calendar.months || [])
    .map((month) => ({
      firstDay: month.firstDay,
      column: monthColumn(firstDate, month.firstDay),
    }))
    .filter((month) => month.column >= 1 && month.column <= 53);

  return {
    username,
    totalContributions: calendar.totalContributions,
    startDate: firstDate,
    endDate: lastDate,
    months,
    days,
  };
}

export async function fetchGitHubContributions(env) {
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
      variables: { login: username },
    }),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const error = new Error(payload.errors?.[0]?.message || `GitHub API error ${response.status}.`);
    error.status = response.ok ? 502 : response.status;
    throw error;
  }

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    const error = new Error(`GitHub user ${username} was not found.`);
    error.status = 404;
    throw error;
  }

  return normalizeContributionCalendar(username, calendar);
}
