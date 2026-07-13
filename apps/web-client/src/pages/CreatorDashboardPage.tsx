import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FormEngine } from '@/components/FormEngine';
import { ImageUploadField } from '@/components/ImageUploadField';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { useCreateProduct, useWatermarkProduct } from '@/hooks/useApi';
import { notify } from '@/lib/toast';

const listingSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  type: Yup.string().oneOf(['COMIC', 'ART', 'ASSET']).required('Type is required'),
  price: Yup.number().min(0, 'Price must be positive').required('Price is required'),
  categories: Yup.string().required('At least one category'),
  tags: Yup.string(),
});

export function CreatorDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const createProduct = useCreateProduct();
  const watermarkProduct = useWatermarkProduct();
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  if (!isAuthenticated || user?.role !== 'CREATOR') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <PageHeader
        title="Creator Dashboard"
        subtitle="Publish listings with automatic VividCraft watermark protection on preview images."
      />

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-surface-border">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vivid-600/20 text-vivid-300 font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-medium text-white">{user?.name}</p>
            <p className="text-xs text-gray-500">Creator account</p>
          </div>
        </div>

        <div className="mb-6">
          <ImageUploadField file={previewFile} onChange={setPreviewFile} />
        </div>

        <FormEngine
          initialValues={{
            title: '',
            description: '',
            type: 'COMIC',
            price: 0,
            categories: '',
            tags: '',
          }}
          validationSchema={listingSchema}
          fields={[
            { name: 'title', label: 'Title', placeholder: 'Neon Dreams Vol. 1' },
            { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Tell buyers what makes your work special...' },
            {
              name: 'type',
              label: 'Product Type',
              type: 'select',
              options: [
                { value: 'COMIC', label: 'Comic / Graphic Novel' },
                { value: 'ART', label: 'Digital Art' },
                { value: 'ASSET', label: 'Asset Pack' },
              ],
            },
            { name: 'price', label: 'Price (USD)', type: 'number', placeholder: '9.99' },
            { name: 'categories', label: 'Categories', placeholder: 'Comics, Sci-Fi', hint: 'Separate with commas' },
            { name: 'tags', label: 'Tags (optional)', placeholder: 'cyberpunk, neon', hint: 'Helps fans discover your work' },
          ]}
          submitLabel={previewFile ? 'Publish & Watermark Preview' : 'Publish Listing'}
          onSubmit={async (values, { resetForm }) => {
            const toastId = notify.loading('Publishing listing...');
            try {
              const product = await createProduct.mutateAsync({
                title: values.title,
                description: values.description,
                type: values.type,
                price: Number(values.price),
                creatorId: user!.id,
                creatorName: user!.name,
                categories: values.categories.split(',').map((c: string) => c.trim()).filter(Boolean),
                tags: values.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
              });

              if (previewFile) {
                notify.dismiss(toastId);
                const wmId = notify.loading('Applying VividCraft watermark...');
                await watermarkProduct.mutateAsync({ productId: product._id, file: previewFile });
                notify.dismiss(wmId);
                notify.success('Listing live with watermarked preview!');
              } else {
                notify.dismiss(toastId);
                notify.success('Listing published on the marketplace!');
              }

              resetForm();
              setPreviewFile(null);
            } catch {
              notify.dismiss(toastId);
              notify.error('Failed to publish listing. Please try again.');
            }
          }}
        />
      </div>
    </div>
  );
}
