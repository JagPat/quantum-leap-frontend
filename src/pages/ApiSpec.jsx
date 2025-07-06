import React from 'react';
import OpenAPISpec from '../components/docs/OpenAPISpec';

export default function ApiSpecPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8">
        <OpenAPISpec />
      </div>
    </div>
  );
}