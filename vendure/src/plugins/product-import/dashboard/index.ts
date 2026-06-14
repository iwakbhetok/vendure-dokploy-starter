import { defineDashboardExtension } from '@vendure/dashboard';
import { UploadIcon } from 'lucide-react';

import { ProductImportPage } from './product-import-page';

export default defineDashboardExtension({
    routes: [
        {
            path: '/product-import',
            component: ProductImportPage,
            navMenuItem: {
                id: 'product-import',
                title: 'Import Products',
                url: '/product-import',
                icon: UploadIcon,
                order: 999,
                requiresPermission: 'CreateProduct',
                sectionId: 'catalog',
            },
        },
    ],
});
