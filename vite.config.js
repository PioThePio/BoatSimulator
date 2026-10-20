import {defineConfig} from 'vite';

// The publication step embeds this one bundle and its CSS into index.html.
export default defineConfig({base:'./',build:{target:'es2018',modulePreload:false}});
