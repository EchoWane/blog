export const SITE = {
  website: "https://echowane.github.io/CSBLOG",
  author: "Amir Rabiee",
  ogImage: "og.png",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 5,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  dynamicOgImage: false,
  lang: "fa", 
  timezone: "UTC", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
