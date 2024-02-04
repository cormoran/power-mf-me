if (
  typeof window.GM_addStyle === 'undefined' &&
  typeof GM !== 'undefined' &&
  typeof GM.addStyle !== 'undefined'
) {
  window.GM_addStyle = GM.addStyle
}

import { createApp } from 'vue'
import App from './App.vue'
import { addColumnToExpenseTable, expenseItemFromRow, findAccounts } from './assets/moneyforwardme'
import { emit } from './assets/eventbus'
const wrapper = document.createElement('div')
document.getElementById('header')?.append(wrapper)
createApp(App).mount(wrapper)

const accounts = findAccounts()
if (accounts.length > 0) {
  localStorage.setItem('power-mf-me-account', JSON.stringify(accounts))
} else if (localStorage.getItem('power-mf-me-account') == null) {
  alert('power-mf-me: 口座情報をローカルに保存するために口座タブに移動してください')
}

const tr = document.createElement('th')
tr.textContent = 'power-mf-me'
tr.style.width = '80px'
addColumnToExpenseTable(10, tr, (newRow) => {
  if (newRow.querySelector('.power-mf-me') != null) {
    return null
  }
  const td = document.createElement('td')
  const btn = document.createElement('button')
  btn.textContent = '編集'
  btn.classList.add('btn', 'btn-default', 'btn-sm')
  btn.onclick = () => {
    emit('openEditModal', { expenseItem: expenseItemFromRow(newRow) })
  }
  td.append(btn)
  td.classList.add('power-mf-me')
  return td
})
