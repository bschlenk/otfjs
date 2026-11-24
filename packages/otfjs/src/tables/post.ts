import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { type PostTable, readPostTable, writePostTable } from './post.gen.js'

export {
  type PostTable,
  type PostTable01,
  type PostTable02,
  type PostTable03,
  readPostTable,
  writePostTable,
} from './post.gen.js'

export const PostTag = 'post'

export const PostTableReader: TableReader<PostTable> = {
  tag: PostTag,
  read: readPostTable,
}

export const PostTableWriter: TableWriter<PostTable> = {
  tag: PostTag,
  write: writePostTable,
}
