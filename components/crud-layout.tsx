import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CrudLayoutProps {
  formTitle: string;
  formContent: React.ReactNode;
  tableTitle: string;
  tableContent: React.ReactNode;
}

export function CrudLayout({ formTitle, formContent, tableTitle, tableContent }: CrudLayoutProps) {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{formTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {formContent}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{tableTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {tableContent}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
