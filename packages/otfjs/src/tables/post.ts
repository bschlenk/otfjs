import { readerFor } from '../table-reader.js'
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

export const PostTableReader = readerFor<PostTable>(PostTag, readPostTable)

export const PostTableWriter = writerFor<PostTable>(PostTag, writePostTable)

export const PostTable = { ...PostTableReader, ...PostTableWriter }
