import {
  findSubAccounts,
  type ExpenseItem,
  type Account,
  changeExpenseItemToTransfer,
  updateTransferSourceOrTarget,
  type NewExpenseItem,
  createItem
} from './moneyforwardme'
import dayjs from '@/assets/dayjs'
export async function changeDate(
  expenseItem: ExpenseItem,
  dateToChange: string,
  subAccountForAdjustment: string
) {
  const subAccounts = findSubAccounts()
  const accountsStr = localStorage.getItem('power-mf-me-account')
  if (accountsStr == null) {
    alert('power-mf-me: 口座情報が保存されていません。口座タブを一度開いてください')
    return
  }
  const accounts: Account[] = JSON.parse(accountsStr)

  if (subAccountForAdjustment == '') {
    alert('調整のための項目を登録する財布を選択してください')
    return
  }
  if (dateToChange == '') {
    alert('日付を入力してください')
    return
  }
  if (!confirm(`この項目を調整のための財布に振替えて、${dateToChange} に同じ項目を登録します`)) {
    return
  }
  const subAccountName = subAccounts.find(
    (subAccount) => subAccount.id == subAccountForAdjustment
  )?.name
  const account = accounts.find((account) => account.name == subAccountName)
  if (account == null) {
    alert('調整のための項目を登録する財布が見つかりませんでした。口座タブを一度開いてください')
    return
  }
  await changeExpenseItemToTransfer(expenseItem.id)
  await updateTransferSourceOrTarget(expenseItem.id, account.id, subAccountForAdjustment)
  const newExpenseItem: NewExpenseItem = {
    is_transfer: false,
    is_income: expenseItem.is_income,
    payment: 2,
    sub_account_id_hash_from: undefined,
    sub_account_id_hash_to: undefined,
    updated_at: dateToChange.replace(/-/g, '/'),
    recurring_flag: false,
    month: dateToChange.slice(0, 7), // 2024-01
    recurring_frequency: 'daily',
    recurring_limit_off_flag: false,
    recurring_rule_only_flag: false,
    amount: expenseItem.amount,
    sub_account_id_hash: subAccountForAdjustment,
    large_category_id: expenseItem.large_category_id,
    middle_category_id: expenseItem.middle_category_id,
    content: expenseItem.content,
    memo: `インポートしたデータの日付変更（元:${expenseItem.updated_at})`
  }
  return await createItem(newExpenseItem)
}

export async function splitExpense(
  expenseItem: ExpenseItem,
  numSplit: number,
  splitFrequency: string,
  splitStartDate: string,
  subAccountForAdjustment: string
) {
  const subAccounts = findSubAccounts()
  const accountsStr = localStorage.getItem('power-mf-me-account')
  if (accountsStr == null) {
    alert('power-mf-me: 口座情報が保存されていません。口座タブを一度開いてください')
    return
  }
  const accounts: Account[] = JSON.parse(accountsStr)
  if (subAccountForAdjustment == '') {
    alert('調整のための項目を登録する財布を選択してください')
    return
  }
  if (numSplit <= 1) {
    alert('分割数は2以上を指定してください')
    return
  }
  if (!confirm(`この項目を調整のための財布に振替えて、${numSplit} 回の分割支出として登録します`)) {
    return
  }
  const subAccountName = subAccounts.find(
    (subAccount) => subAccount.id == subAccountForAdjustment
  )?.name
  const account = accounts.find((account) => account.name == subAccountName)
  if (account == null) {
    alert('調整のための項目を登録する財布が見つかりませんでした。口座タブを一度開いてください')
    return
  }
  await changeExpenseItemToTransfer(expenseItem.id)
  await updateTransferSourceOrTarget(expenseItem.id, account.id, subAccountForAdjustment)
  const startDate = dayjs(splitStartDate, 'YYYY-MM-DD')
  const recurringFrequency =
    splitFrequency == 'monthly' ? 'month' : splitFrequency == 'weekly' ? 'week' : 'day'
  const recurringLimit = dayjs(splitStartDate, 'YYYY-MM-DD').add(numSplit - 1, recurringFrequency)
  const newExpenseItem: NewExpenseItem = {
    is_transfer: false,
    is_income: expenseItem.is_income,
    payment: 2,
    sub_account_id_hash_from: undefined,
    sub_account_id_hash_to: undefined,
    updated_at: startDate.format('YYYY/MM/DD'),
    recurring_flag: true,
    recurring_limit: recurringLimit.format('YYYY/MM/DD'),
    month: startDate.format('YYYY-MM'),
    recurring_frequency: splitFrequency,
    recurring_limit_off_flag: false,
    recurring_rule_only_flag: false,
    amount: Math.ceil(expenseItem.amount / numSplit) * -1,
    sub_account_id_hash: subAccountForAdjustment,
    large_category_id: expenseItem.large_category_id,
    middle_category_id: expenseItem.middle_category_id,
    content: expenseItem.content + `（${numSplit}回に分割）`,
    memo: ''
  }
  let response = await createItem(newExpenseItem)
  const today = dayjs()
  if (today.isAfter(startDate)) {
    let date = startDate.add(1, recurringFrequency)
    while (!today.isBefore(date)) {
      const newExpenseItem2 = {
        ...newExpenseItem,
        updated_at: date.format('YYYY/MM/DD'),
        month: date.format('YYYY-MM'),
        recurring_flag: false,
        recurring_limit: undefined,
        recurring_frequency: ''
      }
      response = await createItem(newExpenseItem2)
      date = date.add(1, recurringFrequency)
    }
  }
  return response
}
export async function setPartOfExpenseToMyExpense(
  expenseItem: ExpenseItem,
  myExpenseAmount: number,
  subAccountForAdjustment: string
) {
  const subAccounts = findSubAccounts()
  const accountsStr = localStorage.getItem('power-mf-me-account')
  if (accountsStr == null) {
    alert('power-mf-me: 口座情報が保存されていません。口座タブを一度開いてください')
    return
  }
  const accounts: Account[] = JSON.parse(accountsStr)
  if (subAccountForAdjustment == '') {
    alert('調整のための項目を登録する財布を選択してください')
    return
  }
  if (myExpenseAmount <= 0) {
    alert('自己負担額を入力してください')
    return
  }
  if (
    !confirm(
      `この項目を調整のための財布に振替えて、${myExpenseAmount} 円を自己負担として登録します`
    )
  ) {
    return
  }
  const subAccountName = subAccounts.find(
    (subAccount) => subAccount.id == subAccountForAdjustment
  )?.name
  const account = accounts.find((account) => account.name == subAccountName)
  if (account == null) {
    alert('調整のための項目を登録する財布が見つかりませんでした。口座タブを一度開いてください')
    return
  }
  await changeExpenseItemToTransfer(expenseItem.id)
  await updateTransferSourceOrTarget(expenseItem.id, account.id, subAccountForAdjustment)
  const myExpenseItem: NewExpenseItem = {
    is_transfer: false,
    is_income: expenseItem.is_income,
    payment: 2,
    sub_account_id_hash_from: undefined,
    sub_account_id_hash_to: undefined,
    updated_at: expenseItem.updated_at,
    recurring_flag: false,
    month: expenseItem.updated_at.slice(0, 7).replace('/', '-'), // 2024-01
    recurring_frequency: 'daily',
    recurring_limit_off_flag: false,
    recurring_rule_only_flag: false,
    amount: myExpenseAmount,
    sub_account_id_hash: subAccountForAdjustment,
    large_category_id: expenseItem.large_category_id,
    middle_category_id: expenseItem.middle_category_id,
    content: expenseItem.content + `（自己負担）`,
    memo: `自己負担額変更（元:${expenseItem.amount})`
  }
  await createItem(myExpenseItem)
  const otherExpenseItem: NewExpenseItem = {
    is_transfer: false,
    is_income: expenseItem.is_income,
    payment: 2,
    sub_account_id_hash_from: undefined,
    sub_account_id_hash_to: undefined,
    updated_at: expenseItem.updated_at,
    recurring_flag: false,
    month: expenseItem.updated_at.slice(0, 7).replace('/', '-'), // 2024-01
    recurring_frequency: 'daily',
    recurring_limit_off_flag: false,
    recurring_rule_only_flag: false,
    amount: expenseItem.amount * -1 - myExpenseAmount,
    sub_account_id_hash: subAccountForAdjustment,
    large_category_id: expenseItem.large_category_id,
    middle_category_id: expenseItem.middle_category_id,
    content: expenseItem.content + `（相手負担）`,
    memo: `自己負担額変更（元:${expenseItem.amount})`
  }
  return await createItem(otherExpenseItem)
}
