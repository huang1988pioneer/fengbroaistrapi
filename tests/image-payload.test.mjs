import assert from 'node:assert/strict';
import test from 'node:test';
import {toPayload} from '../lib/strapi/api.ts';
test('image and media cover URLs are preserved',()=>{
 const url='https://example.test/uploads/image.png';
 assert.equal(toPayload({name:'Image',file:url,cover:url},'image').cover,url);
 assert.equal(toPayload({name:'Document',cover:url},'commondocument').cover,url);
 assert.equal(toPayload({name:'Image',cover:false},'image').cover,null);
});
