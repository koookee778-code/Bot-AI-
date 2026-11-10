import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://yuxdhhzjbuccypwcvtyd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eGRoaHpqYnVjY3lwd2N2dHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzEzNzQsImV4cCI6MjEwOTgwNzM3NH0.2PJ6t6bzB0-eOwru7RHwv6gan7ghiYcfY3SdEjNRrqw';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface WebsiteService {
    id: string;
    title_ar: string;
    title_en: string;
    description_ar: string;
    description_en: string;
    category: string;
    icon?: string;
    active?: boolean;
    sort_order?: number;
    created_at?: string;
}

export interface WebsiteOrder {
    id: string;
    client_name: string;
    phone: string;
    company_or_brand?: string;
    service_id?: string;
    service_title: string;
    details: string;
    status?: string; // 'pending' | 'in_progress' | 'completed' | 'cancelled'
    source?: string;
    whatsapp_notified?: boolean;
    telegram_notified?: boolean;
    created_at?: string;
    updated_at?: string;
    order_code?: string;
    client_id?: string;
    budget?: string;
    expected_duration?: string;
    assigned_to?: string | null;
    assigned_to_name?: string | null;
    assigned_at?: string | null;
    completed_at?: string | null;
    group_message_id?: string | null;
}

export interface ClientRecord {
    id: string;
    phone: string;
    name?: string;
    company?: string;
    notes?: string;
    orders_count?: number;
    status?: string;
    first_contact?: string;
    last_contact?: string;
    metadata?: any;
}

export interface EmployeeRecord {
    id: string; // phone or JID
    name: string;
    role?: string;
    active?: boolean;
    tasks_assigned?: number;
    tasks_completed?: number;
    tasks_in_progress?: number;
    created_at?: string;
    updated_at?: string;
}

export interface BotConfigRecord {
    id: string;
    bot_name: string;
    admin_number: string;
    team_group_id?: string;
    team_group_name?: string;
    system_prompt?: string;
    voice_name?: string;
    updated_at?: string;
}

export interface SurveyRecord {
    id: string;
    employee_id: string;
    employee_name?: string;
    order_id?: string;
    order_code?: string;
    progress_percentage?: number;
    status_update?: string;
    issues_faced?: string;
    created_at?: string;
}

/* =========================================================================
   1. CLIENTS MANAGEMENT (Supabase)
   ========================================================================= */

export async function upsertClient(client: {
    phone: string;
    name?: string;
    company?: string;
    notes?: string;
    metadata?: any;
}): Promise<ClientRecord | null> {
    const cleanPhone = client.phone.replace(/\D/g, '');
    const id = cleanPhone || client.phone;
    try {
        const { data: existing } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        const ordersCount = existing?.orders_count || 0;
        const now = new Date().toISOString();

        const payload: ClientRecord = {
            id,
            phone: client.phone,
            name: client.name || existing?.name || '',
            company: client.company || existing?.company || '',
            notes: client.notes ? (existing?.notes ? `${existing.notes} | ${client.notes}` : client.notes) : (existing?.notes || ''),
            orders_count: ordersCount,
            status: existing?.status || 'active',
            first_contact: existing?.first_contact || now,
            last_contact: now,
            metadata: { ...(existing?.metadata || {}), ...(client.metadata || {}) }
        };

        const { data, error } = await supabase
            .from('clients')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as ClientRecord;
    } catch (err: any) {
        console.error('[Supabase upsertClient Error]:', err?.message || err);
        return null;
    }
}

export async function incrementClientOrderCount(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '') || phone;
    try {
        const { data: client } = await supabase.from('clients').select('orders_count').eq('id', cleanPhone).single();
        const count = (client?.orders_count || 0) + 1;
        await supabase.from('clients').update({ orders_count: count, last_contact: new Date().toISOString() }).eq('id', cleanPhone);
    } catch (e: any) {
        console.warn('[incrementClientOrderCount Warning]:', e?.message || e);
    }
}

export async function getAllClients(): Promise<ClientRecord[]> {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('last_contact', { ascending: false });

        if (error) throw error;
        return (data || []) as ClientRecord[];
    } catch (err: any) {
        console.error('[Supabase getAllClients Error]:', err?.message || err);
        return [];
    }
}

/* =========================================================================
   2. ORDERS MANAGEMENT & TEAM DISPATCH (Supabase)
   ========================================================================= */

export async function createProjectOrder(params: {
    clientName: string;
    phone: string;
    companyOrBrand?: string;
    serviceTitle: string;
    details: string;
    budget?: string;
    expectedDuration?: string;
}): Promise<WebsiteOrder> {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `ORD-${randomDigits}`;
    const cleanPhone = params.phone.replace(/\D/g, '') || params.phone;
    const now = new Date().toISOString();

    // 1. Sync Client
    await upsertClient({
        phone: params.phone,
        name: params.clientName,
        company: params.companyOrBrand,
        notes: `طلب مشروع: ${params.serviceTitle}`
    });
    await incrementClientOrderCount(cleanPhone);

    // 2. Insert Order
    const orderRecord: WebsiteOrder = {
        id: `ord_${Date.now()}_${randomDigits}`,
        order_code: orderCode,
        client_name: params.clientName,
        phone: params.phone,
        client_id: cleanPhone,
        company_or_brand: params.companyOrBrand || '',
        service_id: '',
        service_title: params.serviceTitle,
        details: params.details,
        budget: params.budget || 'غير محدد',
        expected_duration: params.expectedDuration || 'أسبوعين',
        status: 'pending', // pending pickup in team group
        source: 'whatsapp_bot',
        whatsapp_notified: true,
        created_at: now,
        updated_at: now
    };

    const { data, error } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select()
        .single();

    if (error) {
        console.error('[Supabase createProjectOrder Error]:', error);
        throw error;
    }

    return data as WebsiteOrder;
}

export async function assignOrderToEmployee(
    orderIdentifier: string, 
    employeePhone: string, 
    employeeName: string
): Promise<{ success: boolean; order?: WebsiteOrder; message: string }> {
    try {
        const cleanEmpPhone = employeePhone.replace(/\D/g, '') || employeePhone;
        const now = new Date().toISOString();

        // Find order by code (e.g. ORD-1234 or 1234) or by ID
        const cleanCode = (orderIdentifier || '').trim().toUpperCase().replace(/^#/, '');
        
        let targetOrder: WebsiteOrder | null = null;

        if (!cleanCode) {
            // Direct pickup: fetch the latest pending order
            const { data: latestPending, error: pErr } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            if (pErr) console.error('[assignOrderToEmployee fetch latestPending error]:', pErr);

            if (latestPending && latestPending.length > 0) {
                targetOrder = latestPending[0];
            } else {
                // If no pending orders, check for unassigned non-completed orders
                const { data: unassigned } = await supabase
                    .from('orders')
                    .select('*')
                    .is('assigned_to', null)
                    .neq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (unassigned && unassigned.length > 0) {
                    targetOrder = unassigned[0];
                } else {
                    return { success: false, message: `لا توجد أي مشاريع جديدة معلقة بانتظار الاستلام حالياً! جميع المشاريع قيد التنفيذ أو مكتملة.` };
                }
            }
        } else {
            let query = supabase.from('orders').select('*');
            if (cleanCode.startsWith('ORD-')) {
                query = query.eq('order_code', cleanCode);
            } else if (/^\d+$/.test(cleanCode)) {
                query = query.or(`order_code.eq.ORD-${cleanCode},order_code.eq.${cleanCode},id.eq.${cleanCode}`);
            } else {
                query = query.or(`order_code.ilike.%${cleanCode}%,id.eq.${cleanCode}`);
            }

            const { data: foundOrders, error: findErr } = await query;
            if (!findErr && foundOrders && foundOrders.length > 0) {
                targetOrder = foundOrders[0];
            } else {
                // Fallback to latest pending if specified code not found
                const { data: latestPending } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (latestPending && latestPending.length > 0) {
                    targetOrder = latestPending[0];
                } else {
                    return { success: false, message: `لم يتم العثور على مشروع بالكود المحدد (${orderIdentifier})، ولا توجد مشاريع معلقة حالياً.` };
                }
            }
        }

        if (!targetOrder) {
            return { success: false, message: `لم يتم العثور على أي مشروع متاح للاستلام.` };
        }

        if (targetOrder.status === 'in_progress' && targetOrder.assigned_to) {
            return {
                success: false,
                order: targetOrder,
                message: `هذا المشروع (#${targetOrder.order_code}) مستلم بالفعل بواسطة: ${targetOrder.assigned_to_name || targetOrder.assigned_to}`
            };
        }
        if (targetOrder.status === 'completed') {
            return {
                success: false,
                order: targetOrder,
                message: `المشروع #${targetOrder.order_code} مكتمل ومنتهي بالفعل! ✔️`
            };
        }

        return await executeAssignment(targetOrder.id, targetOrder.order_code, cleanEmpPhone, employeeName, now);
    } catch (err: any) {
        console.error('[assignOrderToEmployee Error]:', err?.message || err);
        return { success: false, message: `حدث خطأ أثناء استلام المشروع: ${err.message}` };
    }
}

async function executeAssignment(orderId: string, orderCode: string, empPhone: string, empName: string, now: string) {
    const { data: updated, error: updErr } = await supabase
        .from('orders')
        .update({
            status: 'in_progress',
            assigned_to: empPhone,
            assigned_to_name: empName,
            assigned_at: now,
            updated_at: now
        })
        .eq('id', orderId)
        .select()
        .single();

    if (updErr) throw updErr;

    // Update or insert employee record
    await upsertEmployeeStats(empPhone, empName, { tasks_in_progress_delta: 1, tasks_assigned_delta: 1 });

    return {
        success: true,
        order: updated as WebsiteOrder,
        message: `تم اعتماد استلام المشروع #${orderCode} للمهندس/الموظف ${empName} بنجاح! 🚀`
    };
}

export async function completeOrder(
    orderIdentifier: string, 
    employeePhone: string
): Promise<{ success: boolean; order?: WebsiteOrder; message: string }> {
    try {
        const cleanEmpPhone = employeePhone.replace(/\D/g, '') || employeePhone;
        const now = new Date().toISOString();
        const cleanCode = (orderIdentifier || '').trim().toUpperCase().replace(/^#/, '');

        let target: WebsiteOrder | null = null;

        if (cleanCode.startsWith('ORD-')) {
            const { data } = await supabase.from('orders').select('*').eq('order_code', cleanCode).limit(1);
            if (data && data.length > 0) target = data[0];
        } else if (/^\d+$/.test(cleanCode) && cleanCode.length >= 3) {
            const { data } = await supabase.from('orders').select('*').or(`order_code.eq.ORD-${cleanCode},order_code.eq.${cleanCode}`).limit(1);
            if (data && data.length > 0) target = data[0];
        }

        // If no code or order not found by code, look for orders assigned to this employee
        if (!target) {
            // 1. Try exact cleanEmpPhone
            let { data: empActive } = await supabase
                .from('orders')
                .select('*')
                .eq('assigned_to', cleanEmpPhone)
                .eq('status', 'in_progress')
                .order('assigned_at', { ascending: false })
                .limit(1);

            // 2. Try partial match (last 8 digits) if not found
            if (!empActive || empActive.length === 0) {
                const phoneTail = cleanEmpPhone.slice(-8);
                if (phoneTail.length >= 8) {
                    const { data: tailMatch } = await supabase
                        .from('orders')
                        .select('*')
                        .ilike('assigned_to', `%${phoneTail}%`)
                        .eq('status', 'in_progress')
                        .order('assigned_at', { ascending: false })
                        .limit(1);
                    empActive = tailMatch;
                }
            }

            // 3. Fallback: most recent in_progress order overall
            if (!empActive || empActive.length === 0) {
                const { data: latestInProgress } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('status', 'in_progress')
                    .order('assigned_at', { ascending: false })
                    .limit(1);
                empActive = latestInProgress;
            }

            if (empActive && empActive.length > 0) {
                target = empActive[0];
            }
        }

        if (!target) {
            return { success: false, message: `لم يتم العثور على أي مشروع قيد التنفيذ لتسليمه.` };
        }

        if (target.status === 'completed') {
            return { success: false, message: `المشروع #${target.order_code} مسجل بالفعل أنه منجز ومكتمل! ✔️` };
        }

        return await executeCompletion(target.id, target.order_code, cleanEmpPhone, target.assigned_to_name || 'الموظف', now);
    } catch (err: any) {
        console.error('[completeOrder Error]:', err?.message || err);
        return { success: false, message: `حدث خطأ أثناء تسجيل انتهاء المشروع: ${err.message}` };
    }
}

async function executeCompletion(orderId: string, orderCode: string, empPhone: string, empName: string, now: string) {
    const { data: updated, error: updErr } = await supabase
        .from('orders')
        .update({
            status: 'completed',
            completed_at: now,
            updated_at: now
        })
        .eq('id', orderId)
        .select()
        .single();

    if (updErr) throw updErr;

    // Update employee stats
    await upsertEmployeeStats(empPhone, empName, { tasks_in_progress_delta: -1, tasks_completed_delta: 1 });

    return {
        success: true,
        order: updated as WebsiteOrder,
        message: `ألف مبروك! تم توثيق إنجاز وتسليم المشروع #${orderCode} بنجاح. عاش يا بطل 👏✨`
    };
}

export async function getOrdersReport(): Promise<{
    pending: WebsiteOrder[];
    inProgress: WebsiteOrder[];
    completed: WebsiteOrder[];
    total: number;
}> {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        const all = (data || []) as WebsiteOrder[];
        return {
            pending: all.filter(o => o.status === 'pending' || !o.status || o.status === 'new'),
            inProgress: all.filter(o => o.status === 'in_progress'),
            completed: all.filter(o => o.status === 'completed'),
            total: all.length
        };
    } catch (err: any) {
        console.error('[getOrdersReport Error]:', err?.message || err);
        return { pending: [], inProgress: [], completed: [], total: 0 };
    }
}

/* =========================================================================
   3. EMPLOYEES & WORKFORCE MANAGEMENT (Supabase)
   ========================================================================= */

export async function upsertEmployee(employee: {
    id: string; // phone or JID
    name: string;
    role?: string;
}): Promise<EmployeeRecord | null> {
    const cleanId = employee.id.replace(/\D/g, '') || employee.id;
    try {
        const { data: existing } = await supabase.from('employees').select('*').eq('id', cleanId).single();
        const payload: EmployeeRecord = {
            id: cleanId,
            name: employee.name,
            role: employee.role || existing?.role || 'مطور برمجيات',
            active: true,
            tasks_assigned: existing?.tasks_assigned || 0,
            tasks_completed: existing?.tasks_completed || 0,
            tasks_in_progress: existing?.tasks_in_progress || 0,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('employees')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as EmployeeRecord;
    } catch (e: any) {
        console.error('[upsertEmployee Error]:', e?.message || e);
        return null;
    }
}

export async function upsertEmployeeStats(
    phone: string, 
    name: string, 
    deltas: { tasks_in_progress_delta?: number; tasks_completed_delta?: number; tasks_assigned_delta?: number }
): Promise<void> {
    const cleanId = phone.replace(/\D/g, '') || phone;
    try {
        const { data: existing } = await supabase.from('employees').select('*').eq('id', cleanId).single();
        const inProg = Math.max(0, (existing?.tasks_in_progress || 0) + (deltas.tasks_in_progress_delta || 0));
        const comp = Math.max(0, (existing?.tasks_completed || 0) + (deltas.tasks_completed_delta || 0));
        const assigned = Math.max(0, (existing?.tasks_assigned || 0) + (deltas.tasks_assigned_delta || 0));

        await supabase.from('employees').upsert({
            id: cleanId,
            name: name || existing?.name || 'موظف',
            role: existing?.role || 'فريق عمل',
            active: true,
            tasks_in_progress: inProg,
            tasks_completed: comp,
            tasks_assigned: assigned,
            updated_at: new Date().toISOString()
        });
    } catch (e: any) {
        console.warn('[upsertEmployeeStats Warning]:', e?.message || e);
    }
}

export async function getAllEmployees(): Promise<EmployeeRecord[]> {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('tasks_completed', { ascending: false });

        if (error) throw error;
        return (data || []) as EmployeeRecord[];
    } catch (e: any) {
        console.error('[getAllEmployees Error]:', e?.message || e);
        return [];
    }
}

/* =========================================================================
   4. SURVEYS & CHECK-INS (Supabase)
   ========================================================================= */

export async function recordSurveyResponse(survey: {
    employeeId: string;
    employeeName?: string;
    orderId?: string;
    orderCode?: string;
    progressPercentage: number;
    statusUpdate: string;
    issuesFaced?: string;
}): Promise<void> {
    try {
        await supabase.from('surveys').insert({
            id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            employee_id: survey.employeeId,
            employee_name: survey.employeeName || '',
            order_id: survey.orderId || '',
            order_code: survey.orderCode || '',
            progress_percentage: survey.progressPercentage,
            status_update: survey.statusUpdate,
            issues_faced: survey.issuesFaced || 'لا يوجد معوقات',
            created_at: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('[recordSurveyResponse Error]:', e?.message || e);
    }
}

/* =========================================================================
   5. BOT CONFIGURATION (Supabase)
   ========================================================================= */

export async function getBotConfig(): Promise<BotConfigRecord> {
    try {
        const { data, error } = await supabase
            .from('bot_config')
            .select('*')
            .eq('id', 'default')
            .single();

        if (error || !data) {
            return {
                id: 'default',
                bot_name: 'سارة',
                admin_number: '201093625469',
                team_group_id: '120363412539964956@g.us',
                team_group_name: 'فريق العمل Texora',
                voice_name: 'lulwa'
            };
        }
        return data as BotConfigRecord;
    } catch {
        return {
            id: 'default',
            bot_name: 'سارة',
            admin_number: '201093625469',
            team_group_id: '120363412539964956@g.us',
            team_group_name: 'فريق العمل Texora',
            voice_name: 'lulwa'
        };
    }
}

export async function updateBotConfig(updates: Partial<BotConfigRecord>): Promise<void> {
    try {
        await supabase
            .from('bot_config')
            .upsert({
                id: 'default',
                ...updates,
                updated_at: new Date().toISOString()
            });
    } catch (e: any) {
        console.error('[updateBotConfig Error]:', e?.message || e);
    }
}

/* =========================================================================
   6. SCHEDULED TASKS (Supabase)
   ========================================================================= */

export async function createScheduledTask(task: {
    title: string;
    taskType: string;
    scheduleTime: Date | string;
    targetPhone?: string;
    payload?: any;
    createdBy?: string;
}): Promise<void> {
    try {
        await supabase.from('scheduled_tasks').insert({
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: task.title,
            task_type: task.taskType,
            schedule_time: new Date(task.scheduleTime).toISOString(),
            target_phone: task.targetPhone || '',
            payload: task.payload || {},
            status: 'pending',
            created_by: task.createdBy || 'admin',
            created_at: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('[createScheduledTask Error]:', e?.message || e);
    }
}

export async function getPendingScheduledTasks(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('scheduled_tasks')
            .select('*')
            .eq('status', 'pending')
            .lte('schedule_time', new Date().toISOString());

        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('[getPendingScheduledTasks Error]:', e?.message || e);
        return [];
    }
}

export async function markTaskExecuted(taskId: string): Promise<void> {
    try {
        await supabase.from('scheduled_tasks').update({
            status: 'executed',
            executed_at: new Date().toISOString()
        }).eq('id', taskId);
    } catch (e: any) {
        console.error('[markTaskExecuted Error]:', e?.message || e);
    }
}

/* =========================================================================
   7. SERVICES & BOT STATE (Existing Compatibility)
   ========================================================================= */

export async function getActiveServices(): Promise<WebsiteService[]> {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return (data || []) as WebsiteService[];
    } catch (err: any) {
        console.error('[Supabase getActiveServices Error]:', err?.message || err);
        return [];
    }
}

export async function addWebsiteService(service: {
    id?: string;
    title_ar: string;
    title_en?: string;
    description_ar: string;
    description_en?: string;
    category?: string;
    icon?: string;
}): Promise<WebsiteService> {
    const rawId = service.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newService: WebsiteService = {
        id: rawId.toLowerCase().replace(/\s+/g, '-'),
        title_ar: service.title_ar,
        title_en: service.title_en || service.title_ar,
        description_ar: service.description_ar,
        description_en: service.description_en || service.description_ar,
        category: service.category || 'custom-services',
        icon: service.icon || 'Sparkles',
        active: true,
        sort_order: 99
    };

    const { data, error } = await supabase
        .from('services')
        .upsert(newService)
        .select()
        .single();

    if (error) throw error;
    return data as WebsiteService;
}

export async function removeWebsiteService(serviceIdOrTitle: string): Promise<boolean> {
    const term = serviceIdOrTitle.trim();
    const { error } = await supabase
        .from('services')
        .delete()
        .or(`id.eq.${term},title_ar.ilike.%${term}%,title_en.ilike.%${term}%`);

    if (error) throw error;
    return true;
}

export async function saveOrderToSupabase(order: WebsiteOrder): Promise<WebsiteOrder> {
    const { data, error } = await supabase
        .from('orders')
        .upsert({
            ...order,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data as WebsiteOrder;
}

export async function getLiveStats(): Promise<{
    totalVisits: number;
    totalOrders: number;
    newOrders: number;
    activeServicesCount: number;
    recentOrders: WebsiteOrder[];
}> {
    try {
        const { count: visitsCount } = await supabase.from('analytics').select('*', { count: 'exact', head: true });
        const { data: allOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        const { count: servicesCount } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('active', true);
        const ordersList = (allOrders || []) as WebsiteOrder[];
        return {
            totalVisits: visitsCount || 0,
            totalOrders: ordersList.length,
            newOrders: ordersList.filter(o => o.status === 'pending' || o.status === 'new' || !o.status).length,
            activeServicesCount: servicesCount || 0,
            recentOrders: ordersList.slice(0, 5)
        };
    } catch {
        return { totalVisits: 0, totalOrders: 0, newOrders: 0, activeServicesCount: 0, recentOrders: [] };
    }
}

export async function getPendingOrders(): Promise<WebsiteOrder[]> {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'pending')
            .neq('source', 'whatsapp_bot')
            .eq('whatsapp_notified', false)
            .order('created_at', { ascending: true })
            .limit(10);

        if (error) throw error;
        return (data || []) as WebsiteOrder[];
    } catch {
        return [];
    }
}

export async function markOrderNotified(
    orderId: string, 
    updates: { whatsapp_notified?: boolean; telegram_notified?: boolean; status?: string }
): Promise<void> {
    try {
        await supabase
            .from('orders')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
    } catch (err: any) {
        console.error('[Supabase markOrderNotified Error]:', err?.message || err);
    }
}

export async function updateBotState(state: {
    qr_code?: string | null;
    is_connected?: boolean;
    phone_number?: string;
}): Promise<void> {
    try {
        await supabase
            .from('bot_state')
            .upsert({
                id: 'default',
                ...state,
                updated_at: new Date().toISOString()
            });
    } catch (err: any) {
        console.error('[Supabase updateBotState Error]:', err?.message || err);
    }
}
