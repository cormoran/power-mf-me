import mitt from 'mitt'
import type { ExpenseItem } from './moneyforwardme'

type GlobalEvents = {
  openEditModal: { expenseItem: ExpenseItem }
}

const emitter = mitt<GlobalEvents>()

export function on<T extends keyof GlobalEvents>(
  event: T,
  handler: (payload: GlobalEvents[T]) => any
) {
  emitter.on(event, handler)
  return () => emitter.off(event, handler)
}

export function emit(event: keyof GlobalEvents, payload: GlobalEvents[keyof GlobalEvents]) {
  console.log('emit', event, payload)
  emitter.emit(event, payload)
}
