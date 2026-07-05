export function getApiUrls() {
  return {
    research: "/api",
    community: "/api",
    college: "/api",
    analytics: "/api",
    auth: "/api",
  };
}

export function getServiceUrl(service: "research" | "community" | "college" | "analytics" | "auth") {
  return getApiUrls()[service];
}
