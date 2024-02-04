import { ensureNonNull } from './util'

/**
 * Expense aggregation group. It is subset of sub accounts and aggregation window setting.
 */
export interface Group {
  id: string
  name: string
  selected?: boolean
}

/**
 * Find all groups from opening page.
 * It works only if current page contains group selection dropdown. Otherwise it returns empty array.
 */
export function findGroups(): Group[] {
  return Array.from(document.querySelectorAll<HTMLOptionElement>('#group_id_hash option').values())
    .map((e) => {
      return {
        id: e.value,
        name: e.textContent ?? '?',
        selected: e.selected
      }
    })
    .filter((g) => g.id != 'create_group' && g.id != '0')
}

/**
 * SubAccount is minimum unit of banking account.
 * A banking account can have multiple sub accounts. (e.g. normal account and saving account)
 * Note that manually created wallet account has only one sub account.
 */
export interface SubAccount {
  id: string
  name: string
}

/**
 * Find all sub accounts from opening page.
 * It works only if current page contains "収入・支出詳細" table and the table contains at least one manually registered expense item. Otherwise it returns empty array.
 */
export function findSubAccounts(): SubAccount[] {
  const select: HTMLSelectElement | null = document
    .querySelectorAll<HTMLSelectElement>('select.v_sub_account_id_hash')
    .item(0)
  if (select == null) {
    return []
  }
  return Array.from(select.options).map((e) => {
    return {
      id: e.value,
      name: (e.textContent ?? '?').replace(/\s(.*)$/g, '')
    }
  })
}

/**
 * Account is registered banking account and wallet.
 * An account can have multiple sub accounts. (e.g. normal account and saving account)
 */
export interface Account {
  id: string
  name: string
}

/**
 * Find all accounts from opening page.
 * It works only in "https://moneyforward.com/accounts" page. Otherwise it returns empty array.
 */
export function findAccounts(): Account[] {
  const trs = document.querySelectorAll<HTMLTableRowElement>('#account-table tbody tr')
  return Array.from(trs.values()).map((tr) => {
    return {
      id: tr.id,
      name: tr.querySelector('td a')?.textContent ?? '?'
    }
  })
}

function watchExpenseTableItemUpdates(
  table: HTMLTableElement,
  onNewRow: (row: HTMLTableRowElement) => void = (r) => {},
  onDeleteRow: (row: HTMLTableRowElement) => void = (r) => {}
) {
  const tbody = table.tBodies.item(0)
  if (tbody == null) {
    return
  }
  for (const row of tbody.rows) {
    onNewRow(row)
  }
  const observer = new MutationObserver((mutations) => {
    mutations
      .filter((m) => m.addedNodes.length > 0 && m.type == 'childList' && m.target == tbody)
      .forEach((m) => {
        console.log(`watchExpenseTableItemUpdates: type: ${m.type}`)
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLTableRowElement) {
            onNewRow(n)
          }
        })
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLTableRowElement) {
            onDeleteRow(n)
          }
        })
      })
  })
  observer.observe(table, { childList: true, subtree: true })
  return () => observer.disconnect()
}

function insertAt(parent: HTMLElement, index: number, item: HTMLElement) {
  const nextItem = parent.children.item(index)
  if (nextItem == null) {
    parent.append(item)
  } else {
    parent.insertBefore(item, nextItem)
  }
}

/**
 * Watch update of "収入・支出詳細" table. Used to add custom column to the table.
 * @param index index to insert new column
 * @param tr new column header
 * @param createNewTd function to create new column cell from row
 */
export function addColumnToExpenseTable(
  index: number,
  tr: HTMLTableCellElement,
  createNewTd: (row: HTMLTableRowElement) => HTMLTableCellElement | null
) {
  const table = document.getElementById('cf-detail-table') as HTMLTableElement | null
  if (table == null || table instanceof HTMLTableElement == false) {
    return
  }
  const threadRow = table.tHead?.rows?.item(0)
  if (threadRow == null) {
    return
  }
  insertAt(threadRow, index, tr)
  return watchExpenseTableItemUpdates(table, (row) => {
    const td = createNewTd(row)
    if (td != null) {
      insertAt(row, index, td)
    }
  })
}

/**
 * Expense item imported from external bank account.
 */
export interface ImportedExpenseItem {
  type: 'imported'
  // fields in form
  id: string
  table_name: string // what's this?
  is_income: boolean // 0 (支出) or 1 (収入)
  large_category_id: number // 大項目
  middle_category_id: number // 中項目
  sub_account_id_hash: string // 保有金融機関
  is_target?: boolean // 0 1 (計算対象) or null (振替)
  memo: string
  // fields not in form
  updated_at: string // 2024/01/20 日付
  amount: number
  content: string
}

/**
 * Expense item registered by user to wallet account.
 */
export interface ManuallyAddedExpenseItem {
  type: 'manually_added'
  // fields in form
  // - immutable fields
  id: string
  original_amount: number
  table_name: string // what's this?
  is_income: boolean // 0 (支出) or 1 (収入)
  // - mutable fields
  large_category_id: number // 大項目
  middle_category_id: number // 中項目
  sub_account_id_hash: string // 保有金融機関
  is_target?: boolean // 0 1 (計算対象) or null (振替)
  updated_at: string // 2024/01/20 日付
  amount: number
  content: string
  memo: string
}
export type ExpenseItem = ImportedExpenseItem | ManuallyAddedExpenseItem

/**
 * Build expense item object by parsing given row.
 * The row need to be part of "収入・支出詳細" table.
 */
export function expenseItemFromRow(row: HTMLTableRowElement): ExpenseItem {
  const isImportedItem =
    row.querySelector<HTMLInputElement>('input[name="user_asset_act[amount]"]') == null
  const parse = (name: string) =>
    row.querySelector<HTMLInputElement>(`input[name="user_asset_act[${name}]"]`)?.value
  const parseInt2 = (name: string) => parseInt(name.replace(/,/g, ''))
  const isTarget = parse('is_target')
  if (isImportedItem) {
    const date = ensureNonNull(
      row.querySelector<HTMLTableCellElement>('td.date')?.dataset?.tableSortableValue
    )
    const v: ImportedExpenseItem = {
      type: 'imported',
      id: ensureNonNull(parse('id')),
      table_name: ensureNonNull(parse('table_name')),
      is_income: ensureNonNull(parse('is_income')) == '1',
      large_category_id: parseInt2(ensureNonNull(parse('large_category_id'))),
      middle_category_id: parseInt2(ensureNonNull(parse('middle_category_id'))),
      sub_account_id_hash: ensureNonNull(parse('sub_account_id_hash')),
      is_target: isTarget !== undefined ? isTarget == '1' : undefined,
      memo: ensureNonNull(parse('memo')),
      updated_at: date.substring(0, 10), // 2024/01/01
      amount: parseInt2(
        ensureNonNull(row.querySelector<HTMLDivElement>('td.amount span.offset')?.textContent)
      ),
      content: ensureNonNull(row.querySelector<HTMLTableCellElement>('td.content')?.textContent)
    }
    return v
  } else {
    const original_amount = ensureNonNull(
      row.querySelector<HTMLInputElement>(`input[name="original_amount"]`)?.value
    )
    const v: ManuallyAddedExpenseItem = {
      type: 'manually_added',
      id: ensureNonNull(parse('id')),
      original_amount: parseInt2(original_amount),
      table_name: ensureNonNull(parse('table_name')),
      is_income: ensureNonNull(parse('is_income')) == '1',
      large_category_id: parseInt2(ensureNonNull(parse('large_category_id'))),
      middle_category_id: parseInt2(ensureNonNull(parse('middle_category_id'))),
      sub_account_id_hash: ensureNonNull(parse('sub_account_id_hash')),
      is_target: isTarget !== undefined ? isTarget == '1' : undefined,
      updated_at: ensureNonNull(parse('updated_at')),
      amount: parseInt2(ensureNonNull(parse('amount'))),
      content: ensureNonNull(parse('content')),
      memo: ensureNonNull(parse('memo'))
    }
    return v
  }
}

export interface NewExpenseItem {
  is_transfer: boolean // 0 or 1
  is_income: boolean // 0 or 1
  payment: number // 2?
  sub_account_id_hash_from?: string
  sub_account_id_hash_to?: string
  updated_at: string // 2024/01/20
  recurring_flag: boolean // 0 or 1
  month: string // 2024-01
  recurring_frequency: string // daily, weekly, monthly?
  recurring_limit?: string // 2024/01/20
  recurring_limit_off_flag: boolean // 0 or 1 謎
  recurring_rule_only_flag: boolean // 0 or 1 謎
  amount: number
  sub_account_id_hash: string
  large_category_id: number
  middle_category_id: number
  content: string
  memo: string
}

/**
 * Register new expense item.
 * @returns response of fetch. It contains javascript which reloads table.
 */
export async function createItem(item: NewExpenseItem) {
  const params = new URLSearchParams()
  params.append('user_asset_act[is_transfer]', item.is_transfer ? '1' : '0')
  params.append('user_asset_act[is_income]', item.is_income ? '1' : '0')
  params.append('user_asset_act[payment]', '2')
  params.append('user_asset_act[sub_account_id_hash_from]', '0')
  params.append('user_asset_act[sub_account_id_hash_to]', '0')
  params.append('user_asset_act[updated_at]', item.updated_at)
  params.append('user_asset_act[recurring_flag]', '0')
  if (item.recurring_flag) {
    params.append('user_asset_act[recurring_flag]', '1')
  }
  params.append('month', item.updated_at.substring(0, 7).replace(/\//g, '-'))
  params.append('user_asset_act[recurring_frequency]', item.recurring_frequency)
  if (item.recurring_limit != null) {
    params.append('user_asset_act[recurring_limit]', item.recurring_limit)
  }
  params.append('user_asset_act[recurring_limit_off_flag]', '0')
  if (item.recurring_limit_off_flag) {
    params.append('user_asset_act[recurring_limit_off_flag]', '1')
  }

  params.append(
    'user_asset_act[recurring_rule_only_flag]',
    item.recurring_rule_only_flag ? '1' : '0'
  )
  params.append('user_asset_act[amount]', String(item.amount))
  params.append('user_asset_act[sub_account_id_hash]', item.sub_account_id_hash)
  params.append(
    'user_asset_act[large_category_id]',
    item.large_category_id == 0 ? '' : item.large_category_id.toString()
  )
  params.append(
    'user_asset_act[middle_category_id]',
    item.middle_category_id == 0 ? '' : item.middle_category_id.toString()
  )
  params.append('user_asset_act[content]', item.content)
  if (!item.recurring_flag) {
    params.append('user_asset_act[memo]', item.memo.substring(0, 20))
  }
  params.append('commit', '保存する')
  return await fetch('/cf/create', {
    method: 'POST',
    headers: buildRequestHeader(),
    body: params
  })
}

/**
 * Change specified expense item to transfer. Transfer target account is set as unspecified.
 * @returns response of fetch. It contains javascript which reloads table.
 */
export async function changeExpenseItemToTransfer(id: string) {
  return await fetch(`/cf/update.js?change_type=enable_transfer&id=${id}`, {
    method: 'PUT',
    headers: buildRequestHeader()
  })
}

/**
 * Set source or target of transfer expense item to specified account.
 * @returns response of fetch. It contains javascript which reloads table.
 */
export async function updateTransferSourceOrTarget(
  expenseItemId: string,
  accountId: string,
  subAccountId: string
) {
  const params = new URLSearchParams()
  params.append('user_asset_act[id]', expenseItemId)
  params.append('user_asset_act[partner_account_id_hash]', accountId)
  params.append('user_asset_act[partner_sub_account_id_hash]', subAccountId)
  params.append('commit', '設定を保存')
  return await fetch('/cf/update', {
    method: 'PUT',
    headers: buildRequestHeader(),
    body: params
  })
}

function buildRequestHeader(): HeadersInit {
  return {
    'X-CSRF-Token':
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    Accept:
      '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ja',
    'X-Requested-With': 'XMLHttpRequest'
  }
}
