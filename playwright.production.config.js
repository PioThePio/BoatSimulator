import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
export default defineConfig({testDir:'./tests',testMatch:'startup.production.js',use:{baseURL:'http://127.0.0.1:4174/BoatSimulator/',headless:true,viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}},webServer:{command:'node tests/serve-production.mjs',url:'http://127.0.0.1:4174/BoatSimulator/',reuseExistingServer:false}});
