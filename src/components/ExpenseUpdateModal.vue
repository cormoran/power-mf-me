<script setup lang="ts">
import {
  findSubAccounts,
  type ExpenseItem,
  type Account,
  type SubAccount
} from '@/assets/moneyforwardme'
import { ref, onMounted, type Ref, computed, watch } from 'vue'
import { on } from '@/assets/eventbus'
import { evalResponseJavascript } from '@/assets/util'
import {
  changeDate,
  setPartOfExpenseToMyExpense,
  splitExpense
} from '@/assets/moneyforwardme_actions'

const accounts: Ref<Account[]> = ref([])
const subAccounts: Ref<SubAccount[]> = ref([])
const expenseItem: Ref<ExpenseItem | null> = ref(null)
const dateToChange = ref('2000/01/01')
const subAccountForAdjustment = ref(
  localStorage.getItem('power-mf-me:subAccountForAdjustment') ?? ''
)
const numSplit = ref(12)
const splitStartDate = ref('2000/01/01')
const splitFrequency = ref('monthly')
const myExpenseAmount = ref(0)
const otherExpenseAmount = computed({
  get: () => {
    if (expenseItem.value == null) {
      return 0
    }
    return expenseItem.value.amount * -1 - myExpenseAmount.value
  },
  set: (value) => {
    if (expenseItem.value == null) {
      return
    }
    myExpenseAmount.value = Math.ceil(expenseItem.value.amount * -1 - value / 100)
  }
})
const myExpenseRatio = computed({
  get: () => {
    if (expenseItem.value == null) {
      return 0
    }
    return (myExpenseAmount.value / expenseItem.value.amount) * -1 * 100
  },
  set: (value) => {
    if (expenseItem.value == null) {
      return
    }
    myExpenseAmount.value = Math.ceil(expenseItem.value.amount * -1 * (value / 100))
  }
})
on('openEditModal', (args) => {
  expenseItem.value = args.expenseItem
  dateToChange.value = args.expenseItem.updated_at.replace(/-/g, '/')
  numSplit.value = 12
  splitStartDate.value = args.expenseItem.updated_at.replace(/-/g, '/')
  splitFrequency.value = 'monthly'
  myExpenseAmount.value = args.expenseItem.amount * -1
})
onMounted(() => {
  subAccounts.value = findSubAccounts()
  const accountsStr = localStorage.getItem('power-mf-me-account')
  if (accountsStr != null) {
    accounts.value = JSON.parse(accountsStr)
  } else {
    alert('power-mf-me: 口座情報が保存されていません。口座タブを一度開いてください')
  }
})
watch(subAccountForAdjustment, (value) => {
  localStorage.setItem('power-mf-me:subAccountForAdjustment', value)
})
async function onClickChangeDate() {
  if (expenseItem.value == null) {
    return
  }
  const result = await changeDate(
    expenseItem.value,
    dateToChange.value,
    subAccountForAdjustment.value
  )
  if (result) {
    evalResponseJavascript(result)
  }

  expenseItem.value = null
}
async function onClickSplitExpense() {
  if (expenseItem.value == null) {
    return
  }
  const response = await splitExpense(
    expenseItem.value,
    numSplit.value,
    splitFrequency.value,
    splitStartDate.value,
    subAccountForAdjustment.value
  )
  if (response) {
    evalResponseJavascript(response)
  }
  expenseItem.value = null
}
async function onClickSetPartOfExpenseToMyExpense() {
  if (expenseItem.value == null) {
    return
  }
  const response = await setPartOfExpenseToMyExpense(
    expenseItem.value,
    myExpenseAmount.value,
    subAccountForAdjustment.value
  )
  if (response) {
    evalResponseJavascript(response)
  }
  expenseItem.value = null
}
</script>
<template>
  <div class="modal" v-if="expenseItem != null">
    <div class="modal-header">
      <button type="button" class="close" @click="expenseItem = null">&times;</button>
      <h3>家計簿の編集 <small>by power-mf-me extension</small></h3>
    </div>
    <div class="modal-body">
      <table class="table">
        <tr>
          <td style="min-width: 50px">日付</td>
          <td>{{ expenseItem.updated_at }}</td>
        </tr>
        <tr>
          <td>内容</td>
          <td>{{ expenseItem.content }}</td>
        </tr>
        <tr>
          <td>金額</td>
          <td>
            <template> {{ expenseItem.is_income ? '収入' : '支出' }} </template>
            {{ expenseItem.amount }}
          </td>
        </tr>
      </table>
      <form class="form-horizontal">
        <fieldset>
          <legend>調整のための項目を登録する財布</legend>
          <div class="control-group">
            <div class="controls">
              <select v-model="subAccountForAdjustment">
                <option
                  v-for="subAccount in subAccounts"
                  :key="subAccount.id"
                  :value="subAccount.id"
                >
                  {{ subAccount.name }}
                </option>
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset v-if="expenseItem.type == 'imported'">
          <legend>日付の変更</legend>
          <span class="help-block">
            クレジットカードからインポートした飛行機の費用を実際に旅行した日に変更する時などに使えます<br />
            この項目を"調整のための財布"に振替えて、"調整のための財布"の{{ dateToChange }}
            に同じ項目を支出として登録します
          </span>
          <div class="control-group">
            <label class="control-label">変更先の日付</label>
            <div class="controls">
              <input type="date" v-model="dateToChange" />
            </div>
          </div>
          <div class="control-group">
            <div class="controls">
              <button class="btn btn-primary" type="button" @click="onClickChangeDate">
                日付を変更
              </button>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>支出を分割</legend>
          <span class="help-block">
            家具や旅行など大きな支出を数ヶ月にわたって分割で払ったことにする時に使えます<br />
            この項目を"調整のための財布"に振替えて、"調整のための財布"に
            {{ numSplit }} 回に分割した繰り返しの支出を登録します
          </span>
          <div class="control-group">
            <label class="control-label">頻度</label>
            <div class="controls">
              <select v-model="splitFrequency">
                <option value="monthly">毎月</option>
                <option value="weekly">毎週</option>
                <option value="daily">毎日</option>
              </select>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">開始日</label>
            <div class="controls">
              <input type="date" v-model="splitStartDate" />
              <span class="help-block">
                繰り返しの支出は {{ splitStartDate }} から {{ splitFrequency }} ごとに登録されます
              </span>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">分割回数</label>
            <div class="controls">
              <div class="input-append">
                <input type="number" v-model="numSplit" />
                <span class="add-on">回に分割する</span>
              </div>
              <span class="help-block">
                １回あたりの支出額は {{ Math.ceil(expenseItem.amount / numSplit) }} 円です
              </span>
            </div>
          </div>
          <div class="control-group">
            <div class="controls">
              <button class="btn btn-primary" type="button" @click="onClickSplitExpense">
                支出を分割
              </button>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>自己負担額を変更</legend>
          <span class="help-block">
            飲み会の費用を自分を含めて全員分建て替えたときに使えます。
            この項目を"調整のための財布"に振替えて、"調整のための財布"に自己負担分の支出と相手負担分の支出の２つを登録します<br />
            相手負担分の支出は計算対象から外してください<br />
            相手からもらった分の収入項目は"調整のための財布"に建て替え登録してください。
          </span>
          <div class="control-group">
            <label class="control-label">自己負担額から設定</label>
            <div class="controls">
              <div class="input-append">
                <input type="number" v-model="myExpenseAmount" />
                <span class="add-on">円を自己負担とする</span>
              </div>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">自己負担割合から設定</label>
            <div class="controls">
              <div class="input-append">
                <input type="number" v-model.lazy="myExpenseRatio" />
                <span class="add-on">%を自己負担とする</span>
              </div>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">相手からもらった額から設定</label>
            <div class="controls">
              <div class="input-append">
                <input type="number" v-model.lazy="otherExpenseAmount" />
                <span class="add-on">円を相手負担とする</span>
              </div>
            </div>
          </div>
          <div class="control-group">
            <div class="controls">
              <button
                class="btn btn-primary"
                type="button"
                @click="onClickSetPartOfExpenseToMyExpense"
              >
                自己負担額を変更
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  </div>
</template>
