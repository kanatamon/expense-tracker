import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	workers: 1,
	webServer: {
		command: "bun run start:prod",
		port: 3001,
		reuseExistingServer: false,
	},
	use: {
		baseURL: "http://localhost:3001",
		viewport: { width: 390, height: 844 },
		contextOptions: {
			isMobile: true,
			hasTouch: true,
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
