import { Modal } from 'antd'

/**
 * Интерфейс параметров для функции тройного подтверждения
 */
interface TripleConfirmOptions {
  itemName: string          // Название удаляемого элемента (например: "Проект Жилой комплекс")
  itemType: string          // Тип элемента (например: "объект", "пользователь", "замечание")
  onConfirm: () => void     // Функция, которая выполнится только после трёх подтверждений
}

/**
 * Функция для тройного подтверждения удаления
 *
 * Защищает от случайного удаления данных, требуя три последовательных подтверждения.
 * На каждом этапе пользователь может отменить действие.
 *
 * @param options - Параметры подтверждения
 * @param options.itemName - Название удаляемого элемента
 * @param options.itemType - Тип удаляемого элемента
 * @param options.onConfirm - Callback-функция, вызываемая после всех трёх подтверждений
 *
 * @example
 * tripleConfirm({
 *   itemName: 'Жилой комплекс "Восход"',
 *   itemType: 'объект',
 *   onConfirm: () => {
 *     // Здесь выполняется фактическое удаление
 *     deleteProject(projectId)
 *   }
 * })
 */
export const tripleConfirm = ({ itemName, itemType, onConfirm }: TripleConfirmOptions) => {
  // ========================================
  // ПЕРВОЕ ПОДТВЕРЖДЕНИЕ
  // ========================================
  Modal.confirm({
    title: `Удалить ${itemType}?`,
    content: (
      <div>
        <p>Вы уверены, что хотите удалить {itemType} <strong>"{itemName}"</strong>?</p>
        <p style={{ color: '#ff4d4f', marginTop: '12px', fontWeight: 'bold' }}>
          ⚠️ Это первое из трёх предупреждений. Система спросит вас ещё 2 раза для безопасности.
        </p>
      </div>
    ),
    okText: 'Да, продолжить',
    okType: 'danger',
    cancelText: 'Отмена',
    width: 500,
    onOk: () => {
      // ========================================
      // ВТОРОЕ ПОДТВЕРЖДЕНИЕ
      // ========================================
      Modal.confirm({
        title: `Вы действительно уверены?`,
        content: (
          <div>
            <p>Вы собираетесь удалить {itemType} <strong>"{itemName}"</strong>.</p>
            <p style={{ color: '#ff4d4f', marginTop: '12px', fontWeight: 'bold' }}>
              ⚠️ Это второе из трёх предупреждений. Остался ещё один шаг.
            </p>
            <p style={{ marginTop: '12px', color: '#666' }}>
              Если вы не уверены, нажмите "Отмена".
            </p>
          </div>
        ),
        okText: 'Да, я уверен',
        okType: 'danger',
        cancelText: 'Отмена',
        width: 520,
        onOk: () => {
          // ========================================
          // ТРЕТЬЕ (ПОСЛЕДНЕЕ) ПОДТВЕРЖДЕНИЕ
          // ========================================
          Modal.confirm({
            title: '⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!',
            content: (
              <div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: '16px' }}>
                  ВНИМАНИЕ! Это третье и последнее предупреждение!
                </p>
                <p style={{ marginTop: '12px', fontSize: '15px' }}>
                  {itemType.charAt(0).toUpperCase() + itemType.slice(1)} <strong>"{itemName}"</strong> будет удалён БЕЗВОЗВРАТНО!
                </p>
                <p style={{ marginTop: '12px', color: '#666' }}>
                  Это действие нельзя отменить. Все связанные данные также будут потеряны.
                </p>
                <p style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff1f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
                  После нажатия кнопки "УДАЛИТЬ ОКОНЧАТЕЛЬНО" данные будут удалены из системы навсегда.
                </p>
              </div>
            ),
            okText: 'УДАЛИТЬ ОКОНЧАТЕЛЬНО',
            okType: 'danger',
            cancelText: 'Отмена',
            width: 560,
            onOk: () => {
              // ========================================
              // ВЫПОЛНЕНИЕ УДАЛЕНИЯ
              // Только после трёх подтверждений вызывается callback
              // ========================================
              onConfirm()
            }
          })
        }
      })
    }
  })
}
