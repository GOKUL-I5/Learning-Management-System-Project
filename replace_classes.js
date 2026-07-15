const fs = require('fs');

let content = fs.readFileSync('src/pages/dashboards/AdminDashboard.jsx', 'utf-8');

// Insert import
if (!content.includes('./AdminDashboard.css')) {
  content = content.replace("import { Checkbox } from 'antd';", "import { Checkbox } from 'antd';\nimport './AdminDashboard.css';");
}

// Layout replacements
content = content.replace('className="min-h-screen bg-slate-50"', 'className="admin-layout"');
content = content.replace('className="bg-white border-b border-slate-200 px-8 flex items-center justify-between"', 'className="admin-header"');
content = content.replace('className="flex items-center gap-3"', 'className="admin-header-left"');
content = content.replace('className="h-8 object-contain"', 'className="admin-org-logo"');
content = content.replace('className="text-xl font-bold text-slate-800 m-0"', 'className="admin-header-title"');
content = content.replace('className="flex items-center gap-4"', 'className="admin-header-right"');
content = content.replace('className="text-right hidden sm:block"', 'className="admin-user-info"');
content = content.replace('className="text-sm font-semibold text-slate-800"', 'className="admin-user-name"');
content = content.replace('className="text-xs text-slate-500"', 'className="admin-org-name"');

content = content.replace('className="border-r border-slate-200 hidden md:flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-white"', 'className="admin-sider"');
content = content.replace('className="p-6 border-b border-slate-100 flex flex-col items-center justify-center"', 'className="admin-logo-upload-container"');
content = content.replace('className="w-full flex flex-col items-center"', 'className="admin-w-full"');
content = content.replace('className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center overflow-hidden cursor-pointer shadow-sm relative group bg-slate-50"', 'className="admin-logo-dropzone"');
content = content.replace('className="w-full h-full object-contain p-2"', 'className="admin-logo-image"');
content = content.replace('className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"', 'className="admin-logo-overlay"');
content = content.replace('className="flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500"', 'className="admin-logo-placeholder"');
content = content.replace('className="text-[10px] font-medium uppercase tracking-wider"', 'className="admin-logo-placeholder-text"');
content = content.replace('className="absolute inset-0 bg-white/80 flex items-center justify-center"', 'className="admin-loading-overlay"');
content = content.replace('className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"', 'className="admin-spinner"');

content = content.replace('className="h-full border-r-0 pt-4"', 'className="admin-menu"');
content = content.replace('className="p-4 md:p-8"', 'className="admin-main-content"');
content = content.replace('className="max-w-5xl mx-auto w-full"', 'className="admin-content-inner"');
content = content.replace('className="bg-white p-2 sm:p-6 rounded-2xl shadow-sm border border-slate-200"', 'className="admin-card"');

content = content.replace('className="mt-6 flex justify-center"', 'className="admin-tab-content"');
content = content.replace('className="w-full max-w-2xl"', 'className="admin-form-container"');
content = content.replace('className="flex flex-col gap-8 items-center"', 'className="admin-flex-center"');
content = content.replace('className="flex flex-col gap-8 items-center w-full"', 'className="admin-flex-center"');
content = content.replace('className="flex gap-4 mt-6"', 'className="admin-flex-end"');

content = content.replace('className="w-full max-w-3xl flex flex-col gap-6"', 'className="admin-form-container"');
content = content.replace('className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-indigo-800 text-sm text-center shadow-sm"', 'className="admin-bulk-instructions"');
content = content.replace('className="w-full flex flex-col items-center gap-4"', 'className="admin-dragger-container"');
content = content.replace('className="w-full p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all shadow-sm"', 'className="admin-dragger"');
content = content.replace('className="text-xl font-semibold text-slate-700"', 'className="admin-dragger-title"');
content = content.replace('className="text-slate-500 mt-3 text-base"', 'className="admin-dragger-subtitle"');
content = content.replace('className="text-indigo-600 font-semibold animate-pulse block mt-2"', 'className="admin-processing-text"');

content = content.replace('className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full"', 'className="admin-table-container"');
content = content.replace('className="flex justify-between items-center mb-4"', 'className="admin-table-header"');
content = content.replace('className="text-lg font-semibold text-slate-800 m-0"', 'className="admin-table-title"');
content = content.replace('className="w-full overflow-x-auto"', 'className="admin-table-wrapper"');

content = content.replace('className="flex flex-col gap-8"', 'className="admin-flex-center admin-w-full"');
content = content.replace('className="grid grid-cols-1 md:grid-cols-2 gap-8"', 'className="admin-grid-2"');
content = content.replace('className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"', 'className="admin-table-container"');
content = content.replace('className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2"', 'className="admin-table-header admin-table-title"');

content = content.replace(/className="flex gap-4 items-center justify-center"/g, 'className="admin-flex-row-gap"');
content = content.replace(/className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"/g, 'className="admin-icon-btn admin-icon-btn-edit"');
content = content.replace(/className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors"/g, 'className="admin-icon-btn admin-icon-btn-delete"');

content = content.replace('className="bg-slate-50"', 'className="admin-logo-dropzone"');
content = content.replace('className="ant-upload-drag-icon flex justify-center"', 'className="admin-upload-icon-container"');
content = content.replace('className="w-8 h-8 text-indigo-500"', 'className="admin-upload-icon"');
content = content.replace('className="text-slate-600 font-medium"', 'className="admin-upload-text"');

content = content.replace('className="w-5 h-5 text-indigo-500"', 'className="admin-course-icon"');
content = content.replace('className="w-5 h-5 text-green-500"', 'className="admin-calendar-icon"');

fs.writeFileSync('src/pages/dashboards/AdminDashboard.jsx', content);
console.log('Replaced AdminDashboard.jsx');
