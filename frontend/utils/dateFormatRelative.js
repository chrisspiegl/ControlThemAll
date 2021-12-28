// https://date-fns.org/docs/formatDistance
import formatDistance from 'date-fns/formatDistance'
// https://date-fns.org/docs/isToday
import isToday from 'date-fns/isToday'

export default function dateFormatRelative(fromDate, toDate = new Date()) {
  return formatDistance(fromDate, toDate, { includeSeconds: true }) + (isToday(toDate) ? ' ago' : '')
}
