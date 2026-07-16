import { Formik, Form, FormikHelpers, FormikValues } from 'formik';
import * as Yup from 'yup';
import { ReactNode } from 'react';

interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
}

interface FormEngineProps<T extends FormikValues> {
  initialValues: T;
  validationSchema: Yup.ObjectSchema<T>;
  onSubmit: (values: T, helpers: FormikHelpers<T>) => void | Promise<void>;
  fields: FormField[];
  submitLabel?: string;
  children?: ReactNode;
}

export function FormEngine<T extends FormikValues>({
  initialValues,
  validationSchema,
  onSubmit,
  fields,
  submitLabel = 'Submit',
  children,
}: FormEngineProps<T>) {
  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
        <Form className="space-y-5">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-content mb-1.5">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={values[field.name] as string}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  rows={4}
                  className="input-field resize-none"
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={values[field.name] as string}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="input-field"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  value={values[field.name] as string | number}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  className="input-field"
                />
              )}
              {field.hint && !errors[field.name] && (
                <p className="mt-1.5 text-xs text-mist">{field.hint}</p>
              )}
              {touched[field.name] && errors[field.name] && (
                <p className="mt-1.5 text-sm text-red-400">{errors[field.name] as string}</p>
              )}
            </div>
          ))}
          {children}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </Form>
      )}
    </Formik>
  );
}
