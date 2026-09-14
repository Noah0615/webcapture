import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUrls } from '../src/lib/urls.ts';
test('normalizes URLs, removes fragments and duplicates, rejects credentials and unsafe protocols',()=>{
  const result=parseUrls('example.com\nhttps://example.com/#section\nftp://example.com\nhttps://user:secret@example.com\nhtp://example.com\nhttps://example.com/path?q=one');
  assert.deepEqual(result.urls,['https://example.com/','https://example.com/path?q=one']);
  assert.equal(result.duplicates,1);assert.equal(result.invalid.length,3);
});
test('supports Unicode domains, quoted CSV lines and empty input',()=>{
  assert.equal(parseUrls('"https://example.com"\r\nhttps://한글.com').urls.length,2);
  assert.deepEqual(parseUrls(''),{urls:[],invalid:[],duplicates:0});
});
