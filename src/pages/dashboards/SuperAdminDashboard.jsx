import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, message, Table, Layout, Typography, Popconfirm } from 'antd';
import { createOrganization, getOrganizationsWithAdmins, createOrganizationAdmin, logoutUser, deleteOrganizationAndAdmin } from '../../firebase/services';
import { Building2, UserPlus, LogOut, ShieldAlert } from 'lucide-react';

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
        <Popconfirm title="Are you sure you want to delete this Organization along with its Admin?" onConfirm={() => handleDeleteOrganization(record.id)} okText="Yes" cancelText="No">
          <Button danger size="small">Delete</Button>
        </Popconfirm>
      ) 
    },
  ];

  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-slate-800 m-0 tracking-tight">Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Santhanabharath The king!</span></h1>
        </div>
        <Button icon={<LogOut className="w-4 h-4" />} onClick={logoutUser} danger>
          Logout
        </Button>
      </Header>

      <Content className="p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card 
            title={<span className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Create New Organization</span>}
            className="shadow-sm rounded-2xl border-slate-200"
          >
            <Form form={organizationForm} layout="vertical" onFinish={handleCreateOrganization}>
              <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
                <Input placeholder="Enter organization name" size="large" />
              </Form.Item>
              <Form.Item name="accessId" label="Organization Access ID" rules={[{ required: true, message: 'Please provide a unique Access ID for this organization' }]}>
                <Input placeholder="Enter custom access ID (e.g., ORG2024)" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-blue-600">
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
                <Select placeholder="Select an organization" size="large">
                  {organizations.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label="Admin Name" rules={[{ required: true }]}>
                <Input placeholder="Enter admin name" size="large" />
              </Form.Item>
              <Form.Item name="email" label="Admin Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="Enter admin email" size="large" />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Admin Phone Number" rules={[{ required: true, message: 'Please input phone number' }]}>
                <Input placeholder="Enter admin phone number" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-indigo-600">
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
  );
};

export default SuperAdminDashboard;
