import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator'
import { validateAddressValue, ADDRESS_TYPE_LABELS } from '@multipass/shared'

/**
 * Validates that `value` matches the format dictated by the sibling `type` field.
 * Skipped when either field is absent (allows partial PATCH payloads).
 */
export function IsValidAddressForType(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAddressForType',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== 'string' || !value) return true // caught by @IsNotEmpty
          const type = (args.object as Record<string, unknown>)['type']
          if (typeof type !== 'string') return true // type absent — can't validate
          return validateAddressValue(value, type)
        },
        defaultMessage(args: ValidationArguments): string {
          const type = (args.object as Record<string, unknown>)['type'] as string
          const label = ADDRESS_TYPE_LABELS[type as keyof typeof ADDRESS_TYPE_LABELS]
          return label ? `Введите корректный ${label}` : 'Некорректный формат адреса'
        },
      },
    })
  }
}
