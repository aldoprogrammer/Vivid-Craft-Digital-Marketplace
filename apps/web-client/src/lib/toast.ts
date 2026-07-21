import toast from 'react-hot-toast';

export const notify = {
  success: (message: string, id?: string) =>
    toast.success(message, {
      id,
      iconTheme: { primary: '#d946ef', secondary: '#fff' },
    }),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id: string) => toast.dismiss(id),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) =>
    toast.promise(promise, messages, {
      iconTheme: { primary: '#d946ef', secondary: '#fff' },
    }),
};
