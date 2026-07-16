import { useState } from 'react';
import * as Yup from 'yup';
import { FormEngine } from '@/components/FormEngine';
import { ImageUploadField } from '@/components/ImageUploadField';
import { useAuthStore } from '@/stores/authStore';
import { useCreateProduct, useUploadProductAsset, useWatermarkProduct } from '@/hooks/useApi';
import { notify } from '@/lib/toast';

const listingSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  type: Yup.string().oneOf(['COMIC', 'ART', 'ASSET']).required('Type is required'),
  price: Yup.number().min(0, 'Price must be positive').required('Price is required'),
  categories: Yup.string().required('At least one category'),
  tags: Yup.string(),
});

interface CreatorCreateFormProps {
  onPublished?: () => void;
}

export function CreatorCreateForm({ onPublished }: CreatorCreateFormProps) {
  const { user } = useAuthStore();
  const createProduct = useCreateProduct();
  const watermarkProduct = useWatermarkProduct();
  const uploadAsset = useUploadProductAsset();
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);

  return (
    <div className="glass-panel p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-content mb-1">New listing</h2>
      <p className="text-sm text-mist mb-6">
        Preview images are auto-watermarked. Upload the purchase asset buyers will download.
      </p>

      <div className="mb-4">
        <p className="text-sm font-medium text-content mb-2">Preview image</p>
        <ImageUploadField file={previewFile} onChange={setPreviewFile} />
      </div>
      <div className="mb-6">
        <p className="text-sm font-medium text-content mb-2">Digital asset file (zip/pdf/image)</p>
        <input
          type="file"
          accept=".zip,.pdf,.png,.jpg,.jpeg,.webp,application/zip,application/pdf,image/*"
          onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)}
          className="input-field"
        />
        {assetFile && <p className="text-xs text-mist mt-1">{assetFile.name}</p>}
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
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Tell buyers what makes your work special...',
          },
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
          {
            name: 'categories',
            label: 'Categories',
            placeholder: 'Comics, Sci-Fi',
            hint: 'Separate with commas',
          },
          {
            name: 'tags',
            label: 'Tags (optional)',
            placeholder: 'cyberpunk, neon',
            hint: 'Helps fans discover your work',
          },
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
              creatorName: user!.name,
              categories: values.categories
                .split(',')
                .map((c: string) => c.trim())
                .filter(Boolean),
              tags: values.tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean),
            });

            if (previewFile) {
              notify.dismiss(toastId);
              const wmId = notify.loading('Applying VividCraft watermark...');
              await watermarkProduct.mutateAsync({ productId: product._id, file: previewFile });
              notify.dismiss(wmId);
            }
            if (assetFile) {
              const assetId = notify.loading('Uploading digital asset...');
              await uploadAsset.mutateAsync({ productId: product._id, file: assetFile });
              notify.dismiss(assetId);
            }
            notify.dismiss(toastId);
            notify.success('Listing published!');

            resetForm();
            setPreviewFile(null);
            setAssetFile(null);
            onPublished?.();
          } catch {
            notify.dismiss(toastId);
            notify.error('Failed to publish listing. Please try again.');
          }
        }}
      />
    </div>
  );
}
