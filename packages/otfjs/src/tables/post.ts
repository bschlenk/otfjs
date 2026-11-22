import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
import { writerFor } from '../table-writer.js'
import {
  type PostTable as PostTableType,
  readPostTable,
  writePostTable,
} from './post.gen.js'

export {
  type PostTable01,
  type PostTable02,
  type PostTable03,
  readPostTable,
  writePostTable,
} from './post.gen.js'

export type PostTable = PostTableType

export const PostTag = 'post'

export const PostTableReader = /* @__PURE__ */ readerFor<PostTable>(
  PostTag,
  readPostTable,
)

export const PostTableWriter = /* @__PURE__ */ writerFor<PostTable>(
  PostTag,
  writePostTable,
)

export const PostTable = /* @__PURE__ */ tableFor(
  PostTableReader,
  PostTableWriter,
)
