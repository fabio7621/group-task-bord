import { ref } from 'vue'

/** 表單送出共用：管 busy 狀態與錯誤訊息，成功回傳 true */
export function useSubmit () {
  const busy = ref(false)
  const error = ref('')

  async function run (action) {
    error.value = ''
    busy.value = true
    try {
      await action()
      return true
    } catch (apiError) {
      error.value = apiError.message
      return false
    } finally {
      busy.value = false
    }
  }

  const reset = () => { error.value = '' }

  return { busy, error, run, reset }
}
