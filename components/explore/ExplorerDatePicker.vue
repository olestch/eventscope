<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

type CalendarView = 'days' | 'months' | 'years'

const props = defineProps<{
  id: string
  label: string
  modelValue: string
  minimum: string
  maximum: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { locale, rt, t, tm } = useI18n()

const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const open = ref(false)
const view = ref<CalendarView>('days')
const focusedDate = ref(props.modelValue)
const visibleMonth = ref(monthStart(props.modelValue))

const intlLocale = computed(() => (locale.value === 'ru' ? 'ru-RU' : 'en-US'))
const weekdays = computed(() =>
  (tm('calendar.weekdays') as Array<Parameters<typeof rt>[0]>).map((message) => rt(message))
)
const monthFormatter = computed(
  () => new Intl.DateTimeFormat(intlLocale.value, { month: 'long', timeZone: 'UTC' })
)
const fullDateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(intlLocale.value, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
)
const accessibleDateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(intlLocale.value, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
)

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function monthStart(value: string): string {
  const date = parseDate(value)
  date.setUTCDate(1)
  return dateOnly(date)
}

function addDays(value: string, amount: number): string {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + amount)
  return dateOnly(date)
}

function addMonths(value: string, amount: number): string {
  const date = parseDate(monthStart(value))
  date.setUTCMonth(date.getUTCMonth() + amount)
  return dateOnly(date)
}

function shiftCalendarMonth(value: string, amount: number): string {
  const source = parseDate(value)
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + amount, 1))
  const finalDay = Math.min(
    source.getUTCDate(),
    new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  )
  target.setUTCDate(finalDay)
  return dateOnly(target)
}

function clamp(value: string): string {
  return value < props.minimum ? props.minimum : value > props.maximum ? props.maximum : value
}

const visibleDate = computed(() => parseDate(visibleMonth.value))
const visibleYear = computed(() => visibleDate.value.getUTCFullYear())
const visibleMonthIndex = computed(() => visibleDate.value.getUTCMonth())
const heading = computed(() => `${monthFormatter.value.format(visibleDate.value)} ${visibleYear.value}`)
const triggerLabel = computed(() => fullDateFormatter.value.format(parseDate(props.modelValue)))
const decadeStart = computed(() => Math.floor(visibleYear.value / 10) * 10)
const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, month) => ({
    month,
    label: monthFormatter.value.format(new Date(Date.UTC(visibleYear.value, month, 1))),
    disabled:
      dateOnly(new Date(Date.UTC(visibleYear.value, month + 1, 0))) < props.minimum ||
      dateOnly(new Date(Date.UTC(visibleYear.value, month, 1))) > props.maximum
  }))
)
const yearOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => decadeStart.value - 1 + index).map((year) => ({
    year,
    muted: year < decadeStart.value || year > decadeStart.value + 9,
    disabled: `${year}-12-31` < props.minimum || `${year}-01-01` > props.maximum
  }))
)
const dayOptions = computed(() => {
  const first = visibleDate.value
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const gridStart = addDays(visibleMonth.value, -mondayOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const value = addDays(gridStart, index)
    const date = parseDate(value)
    return {
      value,
      day: date.getUTCDate(),
      adjacent: date.getUTCMonth() !== visibleMonthIndex.value,
      disabled: value < props.minimum || value > props.maximum,
      today: value === dateOnly(new Date()),
      selected: value === props.modelValue
    }
  })
})

async function focusCurrentOption() {
  await nextTick()
  const selector =
    view.value === 'days'
      ? `[data-date="${focusedDate.value}"]`
      : view.value === 'months'
        ? `[data-month="${visibleMonthIndex.value}"]`
        : `[data-year="${visibleYear.value}"]`
  root.value?.querySelector<HTMLButtonElement>(selector)?.focus()
}

async function openCalendar() {
  focusedDate.value = clamp(props.modelValue)
  visibleMonth.value = monthStart(focusedDate.value)
  view.value = 'days'
  open.value = true
  await focusCurrentOption()
}

function closeCalendar(restoreFocus = true) {
  open.value = false
  if (restoreFocus) void nextTick(() => trigger.value?.focus())
}

function toggleCalendar() {
  if (open.value) closeCalendar()
  else void openCalendar()
}

function selectDate(value: string) {
  if (value < props.minimum || value > props.maximum) return
  emit('update:modelValue', value)
  closeCalendar()
}

async function moveDay(amount: number) {
  focusedDate.value = clamp(addDays(focusedDate.value, amount))
  visibleMonth.value = monthStart(focusedDate.value)
  await focusCurrentOption()
}

function handleDayKey(event: KeyboardEvent, value: string) {
  focusedDate.value = value
  const moves: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7
  }
  if (event.key in moves) {
    event.preventDefault()
    void moveDay(moves[event.key]!)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const weekday = (parseDate(value).getUTCDay() + 6) % 7
    void moveDay(event.key === 'Home' ? -weekday : 6 - weekday)
  } else if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault()
    const direction = event.key === 'PageUp' ? -1 : 1
    focusedDate.value = clamp(shiftCalendarMonth(value, direction))
    visibleMonth.value = monthStart(focusedDate.value)
    void focusCurrentOption()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectDate(value)
  }
}

async function navigate(direction: -1 | 1) {
  const months =
    view.value === 'days' ? direction : view.value === 'months' ? direction * 12 : direction * 120
  visibleMonth.value = addMonths(visibleMonth.value, months)
  focusedDate.value = clamp(visibleMonth.value)
  await focusCurrentOption()
}

async function showMonths() {
  view.value = 'months'
  await focusCurrentOption()
}

async function showYears() {
  view.value = 'years'
  await focusCurrentOption()
}

async function selectMonth(month: number) {
  visibleMonth.value = dateOnly(new Date(Date.UTC(visibleYear.value, month, 1)))
  focusedDate.value = clamp(visibleMonth.value)
  view.value = 'days'
  await focusCurrentOption()
}

async function selectYear(year: number) {
  visibleMonth.value = dateOnly(new Date(Date.UTC(year, visibleMonthIndex.value, 1)))
  focusedDate.value = clamp(visibleMonth.value)
  view.value = 'months'
  await focusCurrentOption()
}

async function moveGridFocus(event: KeyboardEvent, selector: string, columns: number) {
  const buttons = [...(root.value?.querySelectorAll<HTMLButtonElement>(selector) ?? [])].filter(
    (button) => !button.disabled
  )
  const index = buttons.indexOf(event.currentTarget as HTMLButtonElement)
  const offset =
    event.key === 'ArrowLeft'
      ? -1
      : event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp'
          ? -columns
          : event.key === 'ArrowDown'
            ? columns
            : 0
  if (!offset) return
  event.preventDefault()
  buttons[Math.max(0, Math.min(buttons.length - 1, index + offset))]?.focus()
}

function handleOutsidePointer(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) closeCalendar(false)
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>

<template>
  <div ref="root" class="date-picker">
    <span :id="`${id}-label`">{{ label }}</span>
    <button
      :id="id"
      ref="trigger"
      class="date-picker__trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-labelledby="`${id}-label ${id}`"
      @click="toggleCalendar"
    >
      {{ triggerLabel }}
      <span aria-hidden="true">▦</span>
    </button>

    <div
      v-if="open"
      class="calendar-popover"
      role="dialog"
      :aria-label="t('calendar.calendar', { label })"
      @keydown.esc.stop.prevent="closeCalendar()"
    >
      <header class="calendar-header">
        <button
          type="button"
          :aria-label="t(view === 'days' ? 'calendar.previousMonth' : 'calendar.previousYears')"
          @click="navigate(-1)"
        >
          ‹
        </button>
        <button v-if="view === 'days'" type="button" @click="showMonths">{{ heading }}</button>
        <button v-else-if="view === 'months'" type="button" @click="showYears">
          {{ visibleYear }}
        </button>
        <strong v-else>{{ decadeStart }}–{{ decadeStart + 9 }}</strong>
        <button
          type="button"
          :aria-label="t(view === 'days' ? 'calendar.nextMonth' : 'calendar.nextYears')"
          @click="navigate(1)"
        >
          ›
        </button>
      </header>

      <div v-if="view === 'days'" class="calendar-weekdays" aria-hidden="true">
        <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
      </div>
      <div v-if="view === 'days'" class="calendar-days" role="grid" :aria-label="heading">
        <button
          v-for="day in dayOptions"
          :key="day.value"
          type="button"
          role="gridcell"
          :data-date="day.value"
          :disabled="day.disabled"
          :tabindex="day.value === focusedDate ? 0 : -1"
          :class="{
            'is-adjacent': day.adjacent,
            'is-today': day.today,
            'is-selected': day.selected
          }"
          :aria-label="accessibleDateFormatter.format(parseDate(day.value))"
          :aria-selected="day.selected"
          @focus="focusedDate = day.value"
          @click="selectDate(day.value)"
          @keydown="handleDayKey($event, day.value)"
        >
          {{ day.day }}
        </button>
      </div>

      <div v-else-if="view === 'months'" class="calendar-option-grid calendar-option-grid--months">
        <button
          v-for="month in monthOptions"
          :key="month.month"
          type="button"
          :data-month="month.month"
          :disabled="month.disabled"
          :class="{ 'is-selected': month.month === visibleMonthIndex }"
          @click="selectMonth(month.month)"
          @keydown="moveGridFocus($event, '[data-month]', 3)"
        >
          {{ month.label.slice(0, 3) }}
        </button>
      </div>

      <div v-else class="calendar-option-grid calendar-option-grid--years">
        <button
          v-for="year in yearOptions"
          :key="year.year"
          type="button"
          :data-year="year.year"
          :disabled="year.disabled"
          :class="{ 'is-adjacent': year.muted, 'is-selected': year.year === visibleYear }"
          @click="selectYear(year.year)"
          @keydown="moveGridFocus($event, '[data-year]', 3)"
        >
          {{ year.year }}
        </button>
      </div>
    </div>
  </div>
</template>
