// https://date-fns.org/docs/formatDistance
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function formatDateHuman(date = new Date(), long = 'long') {
  const formats = {
    long: 'PPPP',
    medium: 'PPP',
    short: 'PP',
  }
  return format(date, formats[long], { locale: de })
}
