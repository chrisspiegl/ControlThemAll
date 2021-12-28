// https://date-fns.org/docs/formatDistance
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function formatTimeHuman(date = new Date(), long = 'long') {
  const formats = {
    long: 'HH:mm:ss',
    medium: 'HH:mm',
    // short: 'PP',
  }
  return format(date, formats[long], { locale: de })
}
