const fs = require('fs');
const path = 'src/app/mbg-internal-portal/gudang/UnifiedGudangClient.tsx';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('import { toast }')) {
  content = content.replace('import DatePicker', 'import { toast } from "sonner";\nimport ConfirmDialog from "@/components/ConfirmDialog";\nimport DatePicker');
}
content = content.replace(/const \[toast, setToast\].*?\n/g, '');
content = content.replace(/const showToast = \(.*?\n.*?\n.*?\n.*?\n.*?\n/g, '');
fs.writeFileSync(path, content);
