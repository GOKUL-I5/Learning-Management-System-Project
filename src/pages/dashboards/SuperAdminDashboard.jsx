import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, message, Table, Layout, Typography, Popconfirm } from 'antd';
import { createOrganization, getOrganizationsWithAdmins, createOrganizationAdmin, logoutUser, deleteOrganizationAndAdmin, toggleOrganizationStatus } from '../../firebase/services';
import { Building2, UserPlus, LogOut, ShieldAlert } from 'lucide-react';
import './SuperAdminDashboard.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const SuperAdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organizationForm] = Form.useForm();
  const [adminForm] = Form.useForm();

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizationsWithAdmins();
      setOrganizations(data);
    } catch (error) {
      message.error('Failed to load organizations');
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreateOrganization = async (values) => {
    setLoading(true);
    try {
      const newOrg = await createOrganization(values.name, values.accessId);
      message.success(`Organization created! Access ID: ${newOrg.accessId}`);
      organizationForm.resetFields();
      fetchOrganizations();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (values) => {
    setLoading(true);
    try {
      const result = await createOrganizationAdmin(values.organizationId, values.email, values.name, values.phoneNumber);
      message.success(`Admin created! Organization Access ID: ${result.organizationAccessId}`);
      adminForm.resetFields();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (id) => {
    try {
      await deleteOrganizationAndAdmin(id);
      message.success("Organization and linked Admin removed successfully");
      fetchOrganizations();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleToggleStatus = async (record) => {
    try {
      const newStatus = record.status === 'suspended' ? 'active' : 'suspended';
      await toggleOrganizationStatus(record.id, newStatus);
      message.success(`Organization ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`);
      fetchOrganizations();
    } catch (error) {
      message.error(error.message);
    }
  };

  const columns = [
    { title: 'Organization Name', dataIndex: 'name', key: 'name' },
    { title: 'Access ID', dataIndex: 'accessId', key: 'accessId', render: text => <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{text}</span> },
    { title: 'Admin Name', dataIndex: 'adminName', key: 'adminName' },
    { title: 'Admin Email/Phone', key: 'adminContact', render: (_, record) => (
      <div className="text-sm">
        <div>{record.adminEmail !== 'N/A' ? record.adminEmail : 'No Email'}</div>
        <div className="text-slate-400">{record.adminPhone !== 'N/A' ? record.adminPhone : 'No Phone'}</div>
      </div>
    )},
    { title: 'Actions', key: 'actions', render: (_, record) => (
        <div className="flex gap-2 items-center">
          <Button 
            type="primary" 
            danger={record.status !== 'suspended'} 
            className={record.status === 'suspended' ? 'bg-green-600 border-none' : ''}
            onClick={() => handleToggleStatus(record)}
            size="small"
          >
            {record.status === 'suspended' ? 'Reactivate Access' : 'Suspend Access'}
          </Button>
          <Popconfirm title="Are you sure you want to delete this Organization along with its Admin?" onConfirm={() => handleDeleteOrganization(record.id)} okText="Yes" cancelText="No">
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ) 
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-main)' }} className="flex justify-center items-center h-screen w-full">
      <Layout className="app-window-container w-full max-w-[1400px]">
        <Header className="saas-header">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-lg font-bold" style={{ color: 'var(--text-main)' }}>Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Santhanabharath The king!</span></h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col items-end gap-1 hidden sm:flex">
            <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Super Admin</div>
            <div className="text-xs font-bold" style={{ color: '#64748b' }}>System Access: <span style={{ color: '#4f46e5' }}>Global</span></div>
          </div>
          <button onClick={logoutUser} className="top-logout-btn flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </Header>

      <Content className="p-6 w-full w-full superadmin-main-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            title={<span className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Create New Organization</span>}
            className="shadow-sm rounded-2xl border-slate-200"
          >
            <Form form={organizationForm} layout="vertical" onFinish={handleCreateOrganization}>
              <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
                <Input placeholder="Enter organization name" size="large"  className="saas-v3-form-input"/>
              </Form.Item>
              <Form.Item name="accessId" label="Organization Access ID" rules={[{ required: true, message: 'Please provide a unique Access ID for this organization' }]}>
                <Input placeholder="Enter custom access ID (e.g., ORG2024)" size="large"  className="saas-v3-form-input"/>
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full">
                Create Organization
              </Button>
            </Form>
          </Card>

          <Card 
            title={<span className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-500" /> Create Organization Admin</span>}
            className="shadow-sm rounded-2xl border-slate-200"
          >
            <Form form={adminForm} layout="vertical" onFinish={handleCreateAdmin}>
              <Form.Item name="organizationId" label="Select Organization" rules={[{ required: true }]}>
                <Select placeholder="Select an organization" size="large" className="saas-v3-form-select">
                  {organizations.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label="Admin Name" rules={[{ required: true }]}>
                <Input placeholder="Enter admin name" size="large"  className="saas-v3-form-input"/>
              </Form.Item>
              <Form.Item name="email" label="Admin Email" rules={[{ required: true, pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Please enter a valid Email address' }]}>
                <Input placeholder="Enter admin email" size="large"  className="saas-v3-form-input"/>
              </Form.Item>
              <Form.Item name="phoneNumber" label="Admin Phone Number" rules={[{ required: true, pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit mobile number' }]}>
                <Input placeholder="Enter admin phone number" size="large"  className="saas-v3-form-input"/>
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full">
                Create Admin
              </Button>
            </Form>
          </Card>
        </div>

        <div className="w-full">
          <Card 
            title="Registered Organizations" 
            className="shadow-sm rounded-2xl border-slate-200 w-full"
          >
            <Table 
              dataSource={organizations} 
              columns={columns} 
              rowKey="id" 
              pagination={{ pageSize: 8 }}
              className="border border-slate-100 rounded-lg overflow-hidden w-full"
            />
          </Card>
        </div>
      </Content>
      </Layout>
    </div>
  );
};

export default SuperAdminDashboard;
