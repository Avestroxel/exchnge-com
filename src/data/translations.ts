export interface TranslationKeys {
  dashboard: string;
  universal_entry: string;
  safe: string;
  customers: string;
  exchange: string;
  transfers: string;
  reports: string;
  deleted_records: string;
  settings: string;
  logout: string;
  
  // Dashboard
  quick_actions: string;
  recent_activities: string;
  total_customers: string;
  safe_balances_summary: string;
  recent_transactions: string;
  office_capital: string;
  active_users: string;
  net_profits: string;
  system_monitoring: string;
  deposit_action: string;
  withdrawal_action: string;
  exchange_action: string;
  transfer_action: string;
  view_all: string;
  
  // Safe
  safe_management: string;
  safe_description: string;
  safe_adjustment_title: string;
  safe_adjustment_desc: string;
  safe_adjustment_type: string;
  adjusted_by: string;
  
  // Customers
  manage_customers: string;
  customers_desc: string;
  search_placeholder: string;
  add_new_customer: string;
  edit_customer: string;
  delete_customer_confirm: string;
  customer_name: string;
  customer_phone: string;
  customer_password: string;
  customer_notes: string;
  customer_debts_assets: string;
  add_transaction: string;
  
  // Exchange
  currency_exchange_title: string;
  exchange_desc: string;
  buy_usd: string;
  sell_usd: string;
  counter_currency: string;
  rate_label: string;
  amount_usd: string;
  exchange_source: string;
  exchange_submit: string;
  preview_balances: string;
  
  // Transfers
  transfers_title: string;
  transfers_desc: string;
  fast_transfers: string;
  standard_transfers: string;
  internal_transfers: string;
  receiver_name: string;
  receiver_phone: string;
  transfer_fee: string;
  beneficiary: string;
  destination: string;
  buy_rate: string;
  sell_rate: string;
  sender_capital: string;
  receiver_capital: string;
  profit_spread: string;
  deliver_transfer: string;
  print_receipt: string;
  
  // Reports
  reports_title: string;
  reports_desc: string;
  financial_summary: string;
  active_customers_count: string;
  safe_assets: string;
  ranking_customers: string;
  top_earners: string;
  total_transactions_volume: string;
  
  // Settings
  settings_title: string;
  settings_desc: string;
  office_name: string;
  default_currency: string;
  theme_color: string;
  theme_mode: string;
  light_mode: string;
  sky_light_mode: string;
  soft_cream_mode: string;
  dark_mode: string;
  midnight_mode: string;
  sepia_mode: string;
  navy_mode: string;
  font_size: string;
  language_label: string;
  save_changes: string;
  employee_management: string;
  add_new_employee: string;
  full_name: string;
  email_login: string;
  password_label: string;
  role_label: string;
  submit_add: string;
  reset_data_title: string;
  reset_data_desc: string;
  reset_data_btn: string;
  reset_data_confirm: string;
  
  // Currencies Settings
  news_currency_title: string;
  news_currency_code: string;
  news_currency_btn: string;
  news_currency_success: string;
  available_currencies: string;
  
  // Common terms
  status_pending: string;
  status_delivered: string;
  status_cancelled: string;
  type_deposit: string;
  type_withdrawal: string;
  type_exchange: string;
  type_fast_transfer: string;
  type_standard_transfer: string;
  type_internal_transfer: string;
  type_safe_adjustment: string;
  notes_label: string;
  amount_label: string;
  currency_label: string;
  action_label: string;
  date_label: string;
  operator_label: string;
  no_records: string;
}

export const translations: Record<'ku' | 'en' | 'ar', TranslationKeys> = {
  ku: {
    dashboard: 'داشبۆرد',
    universal_entry: 'داخڵکردنی گشتی',
    safe: 'گەنجینە',
    customers: 'کڕیارەکان',
    exchange: 'گۆڕینەوەی دراو',
    transfers: 'حەواڵەکان',
    reports: 'ڕاپۆرتەكان',
    deleted_records: 'سڕاوەکان',
    settings: 'ڕێکخستنەکان',
    logout: 'چوونەدەرەوە',
    
    quick_actions: 'کردارە خێراکان',
    recent_activities: 'دوایین چالاکییەکان',
    total_customers: 'سەرجەم کڕیارەکان',
    safe_balances_summary: 'کۆی گشتی خەزێنە',
    recent_transactions: 'دوایین مامەڵەکان',
    office_capital: 'سەرمایەی کار',
    active_users: 'بەکارهێنەرانی چالاک',
    net_profits: 'قازانجی پاک',
    system_monitoring: 'سستمی چاودێری دارایی',
    deposit_action: 'پارە دانان (کاش داخل)',
    withdrawal_action: 'ڕاکێشان (بردنی کاش)',
    exchange_action: 'ئاڵوگۆڕی دراو',
    transfer_action: 'حەواڵەی نوێ',
    view_all: 'پیشاندانی هەموو',
    
    safe_management: 'بەڕێوەبردنی گەنجینە (خانەی هەمیشەیی)',
    safe_description: 'سەرجەم پارە نەختینەییە فیزیاییەکانی نێو خەزێنەی نووسینگەکەت کەر بەروار بە لایەنی متمانە ڕێکخراوە.',
    safe_adjustment_title: 'دەستکاریکردنی نەختینەی گەنجینە',
    safe_adjustment_desc: 'تەنها بۆ کاتی تێکردنی زیاتری سەرمایەی بنەڕەتی یان دەرهێنانی خەرجییەکان، بەبێ کاریگەری لەسەر کڕیارەکان بەکار دێت.',
    safe_adjustment_type: 'جۆری هەموارکردن',
    adjusted_by: 'ئەنجامدراوە لە لایەن',
    
    manage_customers: 'خزمەتگوزاری و هەژمارەکانی کڕیاران',
    customers_desc: 'چاودێری باڵانس، قەرز، دەقاو و تۆمارکردنی پارە دانان و ڕاکێشانی تایبەت بە کڕیارەکان.',
    search_placeholder: 'گەڕان بەدوای کڕیاردا (ناو یان مۆبایل)...',
    add_new_customer: 'کڕیاری نوێ زیاد بکە',
    edit_customer: 'دەستکاریکردنی زانیارییەکان',
    delete_customer_confirm: 'ئایا دڵنیایت لە سڕینەوەی ئەم کڕیارە؟',
    customer_name: 'ناوی تەواو',
    customer_phone: 'ژمارەی مۆبایل',
    customer_password: 'وتەی تێپەڕبوون (بۆ بینینی کڕیار)',
    customer_notes: 'تێبینییەکی کورت',
    customer_debts_assets: 'ڕانەمای باڵانسی کڕیاران',
    add_transaction: 'تۆمارکردنی حیساب',
    
    currency_exchange_title: 'ئاڵوگۆڕی دۆلار و دراوەکانی تر',
    exchange_desc: 'فرۆشتن یان کڕینی دۆلار بە دراوەکانی تر بە پشتبەستن بە سەرمایەی گەنجینە یان حسابی خودی کڕیار.',
    buy_usd: 'کڕینی دۆلار (Buy USD)',
    sell_usd: 'فرۆشتنی دۆلار (Sell USD)',
    counter_currency: 'دراوی بەرامبەر',
    rate_label: 'نرخی ئاڵوگۆڕ',
    amount_usd: 'بڕی دۆلار ($)',
    exchange_source: 'لایەنی گۆڕەر (سەرچاوە)',
    exchange_submit: 'ئەنجامدانی پڕۆسەی ئاڵوگۆڕ',
    preview_balances: 'پێشبینی باڵانس دوای جێبەجێکردن',
    
    transfers_title: 'بەڕێوەبردنی سیستەمی حەواڵەکان',
    transfers_desc: 'ناردن و وەرگرتنی حەواڵەکان لەسەر ئاستی ناوخۆیی و دەرەکی بە شێوازی جۆراوجۆر.',
    fast_transfers: 'حەواڵەی خێرا (کاش بۆ کاش)',
    standard_transfers: 'حەواڵەی ستاندارد (سپرێت)',
    internal_transfers: 'گوێستنەوەی ناوخۆیی (هەژمار بۆ هەژمار)',
    receiver_name: 'ناوی تەواوی وەرگر',
    receiver_phone: 'ژمارەی وەرگر',
    transfer_fee: 'کرێی حەواڵە',
    beneficiary: 'کڕیاری وەرگر',
    destination: 'شوێنی ڕادەستکردن',
    buy_rate: 'نرخی کڕین (لەسەر نێرەر)',
    sell_rate: 'نرخی فرۆشتن (لەسەر وەرگر)',
    sender_capital: 'بڕی دەرهێنراو لە نێرەر',
    receiver_capital: 'بڕی زیادبوو بۆ وەرگر',
    profit_spread: 'قازانجی ئاڵوگۆڕ (سپرێد)',
    deliver_transfer: 'ڕادەستکردنی کاش و تەواوکردن',
    print_receipt: 'چاپکردنی وەسڵ',
    
    reports_title: 'ڕاپۆرتە داراییەکان و ئامارەکان',
    reports_desc: 'پیشاندانی دۆخی گۆڕانکاری، سەرمایە، قازانجی پاک و کڕیارە چالاکەکان.',
    financial_summary: 'خشتەی پوختەی دارایی',
    active_customers_count: 'کڕیارە خاوەن باڵانسەکان',
    safe_assets: 'بڕی فیزیایی ناو گەنجینە',
    ranking_customers: 'ڕیزبەندی کڕیارە باڵا کێشەکان',
    top_earners: 'زۆرترین کڕیارە قازانج هێنەرەکان',
    total_transactions_volume: 'کۆی گشتی حەواڵە و گۆڕینەوەکان',
    
    settings_title: 'ڕێکخستنەکانی سیستەم و کارمەندان',
    settings_desc: 'تەنها خاوەنکار دەتوانێت ناو، ڕەنگ، دراو و کارمەندەکان ڕێکبخات.',
    office_name: 'ناوی نووسینگەی ئاڵوگۆڕ',
    default_currency: 'دراوی بنەڕەتی پیشاندان',
    theme_color: 'ڕەنگی دەستکاریکردن (تیم)',
    theme_mode: 'دۆخی ڕووناکی / تاریکی',
    light_mode: 'دۆخی شینی ئاسمانی',
    sky_light_mode: 'دۆخی شینی ئاسمانی',
    soft_cream_mode: 'دۆخی سپی و کریستالی گەرم',
    dark_mode: 'دۆخی ڕەشی نێوەشەو',
    midnight_mode: 'دۆخی ڕەشی نێوەشەو',
    sepia_mode: 'دۆخی گەرم و سێپیا',
    navy_mode: 'دۆخی شینی دەریایی',
    font_size: 'قەبارەی نووسینەکان',
    language_label: 'زمانی سیستەم',
    save_changes: 'پاشەکەوتکردنی گۆڕانکارییەکان',
    employee_management: 'بەڕێوەبردنی بەکارهێنەران و کارمەندانی ئۆفیس',
    add_new_employee: 'تۆمارکردنی کارمەندی نوێ',
    full_name: 'ناوی تەواو',
    email_login: 'ئیمەیڵ (بۆ چوونەژوورەوە)',
    password_label: 'وشەی تێپەڕبوون',
    role_label: 'دەسەڵات / ڕۆڵ',
    submit_add: 'تۆمار بکە',
    reset_data_title: 'سفرکردنەوە و پااککردنەوەی گشتی',
    reset_data_desc: 'تەواوی کڕیارەکان، حەواڵەکان، مامەڵەکان دەسڕدرێنەوە بۆ بارودۆخی سفر بۆ دەستپێکردنی داتای پاکی ڕاستەقینە.',
    reset_data_btn: 'سفرکردنەوەی تەواوی داتاکان',
    reset_data_confirm: 'ئایا بە تەواوی دڵنیای لە سفرکردنەوەی سیستەم؟ ئەم پڕۆسەیە ناگەڕێتەوە و سەرجەم داتاکان دەسڕێتەوە!',
    
    news_currency_title: 'زیادکردنی دراوی نوێ بۆ سیستەم',
    news_currency_code: 'کۆدی دراو (بۆ نموونە: EUR, TRY, GBP)',
    news_currency_btn: 'دراو زیاد بکە',
    news_currency_success: 'دراوی نوێ بە سەرکەوتوویی زیادکرا!',
    available_currencies: 'لیستی دراوە چالاکەکان',
    
    status_pending: 'چاوەڕوانە',
    status_delivered: 'ڕادەستکراوە',
    status_cancelled: 'هەڵوەشاوەتەوە',
    type_deposit: 'پارە دانان (کاش داخل)',
    type_withdrawal: 'ڕاکێشان (کاش خارج)',
    type_exchange: 'ئاڵوگۆڕ / گۆڕین',
    type_fast_transfer: 'حەواڵەی خێرا',
    type_standard_transfer: 'حەواڵەی ستاندارد',
    type_internal_transfer: 'گوێستنەوەی ناوخۆیی',
    type_safe_adjustment: 'هەموارکردنی گەنجینە',
    notes_label: 'تێبینی',
    amount_label: 'بڕی پارە',
    currency_label: 'دراو',
    action_label: 'جۆری کار',
    date_label: 'بەروار',
    operator_label: 'کارمەند',
    no_records: 'هیچ تۆمارێک نەدۆزرایەوە.'
  },
  en: {
    dashboard: 'Dashboard',
    universal_entry: 'Universal Entry',
    safe: 'Vault',
    customers: 'Customers',
    exchange: 'Currency Exchange',
    transfers: 'Transfers',
    reports: 'Financial Reports',
    deleted_records: 'Deleted Records',
    settings: 'Settings',
    logout: 'Logout',
    
    quick_actions: 'Quick Actions',
    recent_activities: 'Recent Activities',
    total_customers: 'Total Customers',
    safe_balances_summary: 'Total Vault Cash',
    recent_transactions: 'Recent Transactions',
    office_capital: 'Working Capital',
    active_users: 'Active Users',
    net_profits: 'Net Profits',
    system_monitoring: 'Financial Monitioring System',
    deposit_action: 'Deposit (In Cash)',
    withdrawal_action: 'Withdrawal (Out Cash)',
    exchange_action: 'Currency Exchange',
    transfer_action: 'New Transfer',
    view_all: 'View All',
    
    safe_management: 'Vault Management (Safe)',
    safe_description: 'All physical cash reserves currently stored inside your office vault, tracked by currency.',
    safe_adjustment_title: 'Vault Cash Adjustment',
    safe_adjustment_desc: 'Used only for injecting startup capital or withdrawing general expenses. Does not affect customer balances.',
    safe_adjustment_type: 'Adjustment Type',
    adjusted_by: 'Adjusted By',
    
    manage_customers: 'Customer Accounts & Services',
    customers_desc: 'Monitor balances, debts, deposits, and record custom customer withdrawals or deposits.',
    search_placeholder: 'Search customer (Name, Phone)...',
    add_new_customer: 'Add New Customer',
    edit_customer: 'Edit Info',
    delete_customer_confirm: 'Are you sure you want to delete this customer?',
    customer_name: 'Full Name',
    customer_phone: 'Phone Number',
    customer_password: 'Password (for Customer client sign-in)',
    customer_notes: 'Short Note',
    customer_debts_assets: 'Customer Balance Summary',
    add_transaction: 'Record Ledger',
    
    currency_exchange_title: 'Currency Exchange Center',
    exchange_desc: 'Buy or sell USD against other foreign currencies, drawn from Vault cash or direct customer balances.',
    buy_usd: 'Buy USD',
    sell_usd: 'Sell USD',
    counter_currency: 'Counter Currency',
    rate_label: 'Exchange Rate',
    amount_usd: 'USD Amount ($)',
    exchange_source: 'Exchange Account/Source',
    exchange_submit: 'Process Exchange Operation',
    preview_balances: 'Balance Preview (Post-operation)',
    
    transfers_title: 'Money Transfers Management',
    transfers_desc: 'Send, track, and pay out fast cash-to-cash or standard account-to-account (spread-based) transfers.',
    fast_transfers: 'Fast Transfer (Cash-to-Cash)',
    standard_transfers: 'Standard Transfer (Spread)',
    internal_transfers: 'Internal Move (Account-to-Account)',
    receiver_name: 'Receiver Full Name',
    receiver_phone: 'Receiver Phone',
    transfer_fee: 'Transfer Fee',
    beneficiary: 'Beneficiary Customer',
    destination: 'Delivery Destination',
    buy_rate: 'Buy Rate (For Sender)',
    sell_rate: 'Sell Rate (For Receiver)',
    sender_capital: 'Amount deducted from Sender',
    receiver_capital: 'Amount credited to Receiver',
    profit_spread: 'Exchange Profit (Spread)',
    deliver_transfer: 'Pay out & Settle Transfer',
    print_receipt: 'Print Receipt',
    
    reports_title: 'Financial Reports & Metrics',
    reports_desc: 'Summary of financial activities, capital changes, net profit, and high-volume accounts.',
    financial_summary: 'Overall Financial Summary',
    active_customers_count: 'Customers with active balances',
    safe_assets: 'Physical Safe Assets',
    ranking_customers: 'Top Active Customers',
    top_earners: 'Highest Revenue Customers',
    total_transactions_volume: 'Total Transaction Volume',
    
    settings_title: 'Office & User Settings',
    settings_desc: 'Only the Owner can customize the office branding, colors, system currencies, and add or remove staff.',
    office_name: 'Office/Business Name',
    default_currency: 'Default Currency UI',
    theme_color: 'Theme Accents',
    theme_mode: 'Theme Mode',
    light_mode: 'Sky Blue Mode',
    sky_light_mode: 'Sky Blue Mode',
    soft_cream_mode: 'Warm Cream White',
    dark_mode: 'Midnight Black Mode',
    midnight_mode: 'Midnight Black Mode',
    sepia_mode: 'Warm Sepia',
    navy_mode: 'Navy Night',
    font_size: 'Font Size scale',
    language_label: 'System Language',
    save_changes: 'Save Customizations',
    employee_management: 'Staff & Team Management',
    add_new_employee: 'Register New Staff Member',
    full_name: 'Full Name',
    email_login: 'Login Email Address',
    password_label: 'Password',
    role_label: 'System Access Role',
    submit_add: 'Register Staff',
    reset_data_title: 'Complete Database Reset',
    reset_data_desc: 'Wipe all transaction ledgers, active transfers, saved customers, and vault logs to start completely fresh.',
    reset_data_btn: 'Reset System Database',
    reset_data_confirm: 'CRITICAL! Are you absolutely sure you want to reset the entire database? This action is permanent and deletes all customer ledgers, transactions and histories!',
    
    news_currency_title: 'Add New Custom Currency',
    news_currency_code: 'Currency Code (e.g. EUR, TRY, GBP)',
    news_currency_btn: 'Add Currency',
    news_currency_success: 'New currency added successfully!',
    available_currencies: 'Active Currencies',
    
    status_pending: 'Pending',
    status_delivered: 'Delivered',
    status_cancelled: 'Cancelled',
    type_deposit: 'Deposit (In)',
    type_withdrawal: 'Withdrawal (Out)',
    type_exchange: 'Exchange',
    type_fast_transfer: 'Fast Transfer',
    type_standard_transfer: 'Standard Transfer',
    type_internal_transfer: 'Internal Transfer',
    type_safe_adjustment: 'Vault Adjustment',
    notes_label: 'Notes',
    amount_label: 'Amount',
    currency_label: 'Currency',
    action_label: 'Activity',
    date_label: 'Date',
    operator_label: 'Staff Member',
    no_records: 'No match logs found.'
  },
  ar: {
    dashboard: 'لوحة التحكم',
    universal_entry: 'الإدخال العام',
    safe: 'الخزينة العامة',
    customers: 'الحسابات والزبائن',
    exchange: 'صرافة العملات',
    transfers: 'الحوالات المالية',
    reports: 'التقارير المالية',
    deleted_records: 'السجلات المحذوفة',
    settings: 'الإعدادات والمستخدمين',
    logout: 'تسجيل الخروج',
    
    quick_actions: 'الإجراءات السريعة',
    recent_activities: 'آخر الأنشطة والعمليات',
    total_customers: 'إجمالي الزبائن',
    safe_balances_summary: 'إجمالي النقد بالخزينة',
    recent_transactions: 'العمليات الأخيرة',
    office_capital: 'رأس مال العمل الحالي',
    active_users: 'المستخدمين النشطين',
    net_profits: 'صافي الأرباح',
    system_monitoring: 'نظام المراقبة والتدقيق المالي',
    deposit_action: 'إيداع نقدي (سحب لداخل البنك)',
    withdrawal_action: 'سحب نقدي (دفع للزبون)',
    exchange_action: 'عملية صرافة العملات',
    transfer_action: 'تسجيل حوالة جديدة',
    view_all: 'عرض الكل',
    
    safe_management: 'إدارة الخزينة والبنود الفلترة تمثيلية',
    safe_description: 'مجموع الأموال المادية النقدية المخزنة فعلياً داخل خزنة المكتب حسب العملات المختلفة.',
    safe_adjustment_title: 'تعديل أو حقن رصيد الخزينة',
    safe_adjustment_desc: 'يستخدم فقط لضخ رأس المالي المبدئي التجاري أو تدوين النفقات الإدارية العامة، دون التأثير على حسابات العملاء.',
    safe_adjustment_type: 'نوع التسوية',
    adjusted_by: 'تم بواسطة العضو',
    
    manage_customers: 'إدارة حسابات ودفتري الزبائن',
    customers_desc: 'مراقبة وتتبع أرصدة الزبائن، ديونهم، والإيداعات النقدية والتسويات المرتبطة بكل زبون بشكل منفرد.',
    search_placeholder: 'ابحث عن زبون (الاسم أو معرّف الجوال)...',
    add_new_customer: 'إضافة عميل جديد',
    edit_customer: 'تعديل البيانات',
    delete_customer_confirm: 'هل أنت متأكد من رغبتك في حذف هذا الزبون نهائياً؟',
    customer_name: 'الاسم الكامل للعميل',
    customer_phone: 'رقم الهاتف/الجوال',
    customer_password: 'كلمة المرور (لدخول الواجهة العميل)',
    customer_notes: 'ملاحظة موجزة',
    customer_debts_assets: 'الموقف المالي لأرصدة الزبائن',
    add_transaction: 'إجراء قيد حسابي',
    
    currency_exchange_title: 'مركز صرافة تحويل العملات',
    exchange_desc: 'تنفيذ شراء أو بيع الدولار مقابل العملات الأجنبية الأخرى، من أرصدة الخزينة أو من حسابه الدفتري المميز.',
    buy_usd: 'شراء دولار (Buy USD)',
    sell_usd: 'بيع دولار (Sell USD)',
    counter_currency: 'العملة المقابلة بالصرف',
    rate_label: 'سعر التداول والصرف',
    amount_usd: 'مبلغ الدولار الأمريكي ($)',
    exchange_source: 'حساب الصرف (المصدر المستحق)',
    exchange_submit: 'تأكيد وحفظ عملية الصرف',
    preview_balances: 'المعاينة الحسابية المتوقعة بعد العملية',
    
    transfers_title: 'إدارة الحوالات الصادرة والواردة',
    transfers_desc: 'إرسال وتوثيق الحوالات السريعة المباشرة (نقدي لنقدي) أو الحوالات القياسية بفارق تسعير وسبريد محدد.',
    fast_transfers: 'حوالة سريعة (كاش لكاش)',
    standard_transfers: 'حوالة قياسية (سبريد الصرف)',
    internal_transfers: 'تحويل داخلي (من حساب لعميل آخر)',
    receiver_name: 'اسم المستلم الكامل للمال',
    receiver_phone: 'رقم جوال المستلم',
    transfer_fee: 'عمولة ورسوم الخدمة',
    beneficiary: 'العميل المستلم للحساب',
    destination: 'جهة ومكان التسليم الصادر',
    buy_rate: 'سعر الشراء (علي حساب المرسل)',
    sell_rate: 'سعر البيع (علي حساب المستلم)',
    sender_capital: 'المبلغ المخصوم من المرسل',
    receiver_capital: 'المبلغ المضاف للمستلم المالي',
    profit_spread: 'ربح الصرف المالي (سبريد)',
    deliver_transfer: 'تسليم ومقاصة الأموال',
    print_receipt: 'طباعة الفاتورة',
    
    reports_title: 'التقارير والمقاييس المالية والتحليلية',
    reports_desc: 'خلاصة الأداء المهني وحركة رأس مال الأعمال والربح الصافي وأكثف الحسابات حركة.',
    financial_summary: 'الملخص المالي الشامل للشركة',
    active_customers_count: 'الزبائن ذوي الأرصدة النشطة المفتوحة',
    safe_assets: 'الأصول العينية النقدية داخل الخزنة',
    ranking_customers: 'تصنيف العملاء الأكثر نشاطاً',
    top_earners: 'العملاء الأكثر مساهمة في فارق الربح',
    total_transactions_volume: 'مجموع قيم الحوالات والصرف الكلي',
    
    settings_title: 'إعدادات النظام وإدارة الموظفين',
    settings_desc: 'يسمح فقط لصاحب العمل بتخصيص علامة المكتب التجارية، المظهر البصري، العملات، وصلاحيات الموظفين.',
    office_name: 'اسم المكتب التجاري المالي',
    default_currency: 'العملة الافتراضية للواجهة',
    theme_color: 'نمط ولون الواجهة (العام)',
    theme_mode: 'نمط المظهر',
    light_mode: 'الوضع السماوي الفاتح',
    sky_light_mode: 'الوضع السماوي الفاتح',
    soft_cream_mode: 'الوضع الفاتح الدافئ',
    dark_mode: 'وضع سواد منتصف الليل',
    midnight_mode: 'وضع سواد منتصف الليل',
    sepia_mode: 'الدافئ (Warm Sepia)',
    navy_mode: 'الأزرق الداكن (Navy Night)',
    font_size: 'حجم الخط في المستندات',
    language_label: 'لغة النظام والواجهة',
    save_changes: 'حفظ وتثبيت التغييرات',
    employee_management: 'إدارة الحسابات وكتلة موظفي المكتب',
    add_new_employee: 'تسجيل ملف لموظف جديد',
    full_name: 'الاسم الكامل الموثق',
    email_login: 'البريد الإلكتروني للدخول',
    password_label: 'كلمة المرور',
    role_label: 'دور وصلاحية العضو',
    submit_add: 'تسجيل وبث الصلاحية',
    reset_data_title: 'تهيئة وتصفير قاعدة البيانات بالكامل',
    reset_data_desc: 'سيتم مسح كافة الدفاتر الحسابية والزبائن وحركات الخزنة والحوالات للقدرة على إدخال داتا حقيقية نظيفة.',
    reset_data_btn: 'تصفير وقذف جميع البيانات بالكامل',
    reset_data_confirm: 'خطر! هل أنت متأكد تماماً من تصفير وتهيئة قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة وسيتم حذف كل حسابات وتواريخ الدفاتر!',
    
    news_currency_title: 'إضافة عملة نقدية جديدة للنظام',
    news_currency_code: 'رمز العملة (مثال: EUR, TRY, GBP)',
    news_currency_btn: 'إضافة العملة',
    news_currency_success: 'تمت إضافة العملة الجديدة بنجاح للمنظومة!',
    available_currencies: 'العملات النقدية المفعلة بالنظام',
    
    status_pending: 'قيد الانتظار',
    status_delivered: 'تم التسليم',
    status_cancelled: 'تم الإلغاء',
    type_deposit: 'إيداع مالي (كاش داخل)',
    type_withdrawal: 'سحب مالي (كاش خارج)',
    type_exchange: 'صرف وتحويل',
    type_fast_transfer: 'حوالة سريعة كاش',
    type_standard_transfer: 'حوالة سبريد مخصصة',
    type_internal_transfer: 'تحويل حساب داخلي',
    type_safe_adjustment: 'تسوية رصيد الخزينة',
    notes_label: 'ملاحظة',
    amount_label: 'المبلغ القيمة',
    currency_label: 'العملة',
    action_label: 'الإجراء المالي',
    date_label: 'التاريخ',
    operator_label: 'الموظف المسؤول',
    no_records: 'لا توجد بيانات مسجلة مطابقة حتى الآن.'
  }
};
