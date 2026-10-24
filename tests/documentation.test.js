import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {helpMarkup} from '../src/help.js';
test('public documentation is a coherent current manual/model with valid local links, rather than version reports',()=>{
 const root=new URL('../',import.meta.url),files=['README.md','docs/INSTRUKCJA.md','docs/MODEL.md'];assert.deepEqual(fs.readdirSync(new URL('docs/',root)).filter(q=>q.endsWith('.md')).sort(),['INSTRUKCJA.md','MODEL.md']);
 for(const file of files){const text=fs.readFileSync(new URL(file,root),'utf8');assert.ok(!/^#+ .*\bv\d+/m.test(text));for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const href=m[1].split('#')[0];if(!href||/^[a-z]+:/i.test(href))continue;assert.ok(fs.existsSync(new URL(path.join(path.dirname(file),href),root)),file+' → '+href);}}
 assert.ok(helpMarkup.includes('INSTRUKCJA.md')&&helpMarkup.includes('MODEL.md'));assert.ok(!helpMarkup.includes('PHYSICS.md'));
});
