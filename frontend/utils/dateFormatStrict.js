// https://date-fns.org/docs/formatDistance
import formatDistanceStrict from 'date-fns/formatDistanceStrict'
import { de } from 'date-fns/locale'

export default function dateFormatStrict(fromDate, toDate = new Date()) {
  return formatDistanceStrict(fromDate, toDate, { addSuffix: true, locale: de })
}
