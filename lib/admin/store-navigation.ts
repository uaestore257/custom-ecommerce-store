export function storeSettingsNav(platform: boolean, storeId: string) {
  return platform
    ? { label: "Store settings", href: `/admin/stores/${storeId}/settings` }
    : { label: "Store Settings", href: "/admin/settings" };
}

export function storeTeamNav(platform: boolean, role: "OWNER" | "MANAGER" | "STAFF" = "OWNER") {
  return platform || role === "STAFF" ? null : { label: "Team", href: "/admin/team" };
}
