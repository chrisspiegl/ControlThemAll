// https://date-fns.org/docs/format
import format from 'date-fns/format'

export default function dateFormat(date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}
