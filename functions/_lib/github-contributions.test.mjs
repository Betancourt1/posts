import assert from "node:assert/strict";
import test from "node:test";
import {
  contributionRanges,
  fetchGitHubContributions,
  normalizeContributionCalendar,
  normalizeContributionCalendars,
} from "./github-contributions.js";

const calendar = {
  totalContributions: 3,
  months: [
    { firstDay: "2026-06-01", name: "June", totalWeeks: 5, year: 2026 },
  ],
  weeks: [
    {
      firstDay: "2026-05-31",
      contributionDays: [
        { contributionCount: 0, contributionLevel: "NONE", date: "2026-05-31", weekday: 0 },
        { contributionCount: 3, contributionLevel: "FOURTH_QUARTILE", date: "2026-06-01", weekday: 1 },
      ],
    },
  ],
};

test("normalizeContributionCalendar prepares compact client data", () => {
  const result = normalizeContributionCalendar("Betancourt1", calendar);

  assert.equal(result.totalContributions, 3);
  assert.equal(result.startDate, "2026-05-31");
  assert.equal(result.endDate, "2026-06-01");
  assert.equal(result.weekCount, 1);
  assert.deepEqual(result.months, [{ firstDay: "2026-06-01", column: 1 }]);
  assert.deepEqual(result.days[1], { date: "2026-06-01", count: 3, level: 4, weekday: 1 });
});

test("normalizeContributionCalendars joins adjacent years in chronological order", () => {
  const earlier = {
    totalContributions: 2,
    months: [{ firstDay: "2025-06-01" }],
    weeks: [{
      contributionDays: [
        { contributionCount: 2, contributionLevel: "SECOND_QUARTILE", date: "2025-06-01", weekday: 0 },
      ],
    }],
  };
  const result = normalizeContributionCalendars("Betancourt1", [calendar, earlier]);

  assert.equal(result.totalContributions, 5);
  assert.equal(result.startDate, "2025-06-01");
  assert.equal(result.endDate, "2026-06-01");
  assert.equal(result.days.length, 3);
  assert.deepEqual(result.days.map((day) => day.date), [
    "2025-06-01",
    "2026-05-31",
    "2026-06-01",
  ]);
});

test("contributionRanges creates two adjacent one-year requests aligned to Sunday", () => {
  assert.deepEqual(contributionRanges(new Date("2026-07-13T12:00:00Z")), {
    earlierFrom: "2024-07-14T00:00:00.000Z",
    earlierTo: "2025-07-13T23:59:59.999Z",
    recentFrom: "2025-07-14T00:00:00.000Z",
    recentTo: "2026-07-13T23:59:59.999Z",
  });
});

test("fetchGitHubContributions authenticates server-side and normalizes GraphQL data", async () => {
  const originalFetch = globalThis.fetch;
  let request;

  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      data: {
        user: {
          earlier: { contributionCalendar: calendar },
          recent: { contributionCalendar: calendar },
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const result = await fetchGitHubContributions(
      {
        GITHUB_OWNER: "Betancourt1",
        GITHUB_TOKEN: "server-secret",
      },
      new Date("2026-07-13T12:00:00Z"),
    );
    const body = JSON.parse(request.options.body);

    assert.equal(request.url, "https://api.github.com/graphql");
    assert.equal(request.options.headers.Authorization, "Bearer server-secret");
    assert.equal(body.variables.login, "Betancourt1");
    assert.equal(body.variables.earlierFrom, "2024-07-14T00:00:00.000Z");
    assert.equal(body.variables.recentTo, "2026-07-13T23:59:59.999Z");
    assert.equal(result.days.length, 2);
    assert.equal(JSON.stringify(result).includes("server-secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
