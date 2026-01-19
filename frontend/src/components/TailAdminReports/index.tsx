import React from "react"
import { Card, Statistic, Table, Badge, Row, Col } from "antd"
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons"

interface ReportCardProps {
  title: string
  value: string | number
  percentage?: string
  icon?: React.ReactNode
  trend?: "up" | "down"
}

const ReportCard: React.FC<ReportCardProps> = ({ title, value, percentage, icon, trend }) => {
  return (
    <Card 
      bordered={false}
      style={{
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      <Row justify="space-between" align="middle">
        <Col flex="auto">
          <Statistic 
            title={title}
            value={value}
            prefix={icon}
            suffix={
              percentage && (
                <span style={{ fontSize: "14px", marginLeft: "8px", color: trend === "up" ? "#52c41a" : "#ff4d4f" }}>
                  {trend === "up" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {percentage}
                </span>
              )
            }
            valueStyle={{ color: "#1890ff", fontSize: "28px" }}
          />
        </Col>
      </Row>
    </Card>
  )
}

interface DashboardChartProps {
  title: string
  data: any[]
  height?: number
}

const LineChartComponent: React.FC<DashboardChartProps> = ({ title, data, height = 400 }) => {
  return (
    <Card 
      title={title}
      bordered={false}
      style={{
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorSignIns" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" stroke="#bfbfbf" />
          <YAxis stroke="#bfbfbf" />
          <Tooltip 
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #d9d9d9",
              borderRadius: "4px"
            }}
          />
          <Area type="monotone" dataKey="signIns" stroke="#1890ff" strokeWidth={2} fillOpacity={1} fill="url(#colorSignIns)" name="Sign-ins" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

const BarChartComponent: React.FC<DashboardChartProps> = ({ title, data, height = 400 }) => {
  return (
    <Card 
      title={title}
      bordered={false}
      style={{
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" stroke="#bfbfbf" />
          <YAxis stroke="#bfbfbf" />
          <Tooltip 
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #d9d9d9",
              borderRadius: "4px"
            }}
          />
          <Bar dataKey="value" fill="#1890ff" name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

const PieChartComponent: React.FC<{
  title: string
  data: Array<{ name: string; value: number; color: string }>
  height?: number
}> = ({ title, data, height = 400 }) => {
  return (
    <Card 
      title={title}
      bordered={false}
      style={{
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%", height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              cx="50%" 
              cy="50%" 
              startAngle={0}
              endAngle={360}
              labelLine={false} 
              label={({ name, value }) => `${name}: ${value}%`} 
              outerRadius={100}
              innerRadius={60}
              fill="#1890ff" 
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #d9d9d9",
                borderRadius: "4px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

interface TableColumn {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  width?: string | number
}

interface TableProps {
  title: string
  columns: TableColumn[]
  data: any[]
  onRowClick?: (record: any) => void
}

const TableComponent: React.FC<TableProps> = ({ title, columns, data, onRowClick }) => {
  const antColumns = columns.map((col) => ({
    title: col.label,
    dataIndex: col.key,
    key: col.key,
    width: col.width,
    render: col.render ? (_: any, record: any) => col.render?.(record[col.key], record) : undefined,
  }))

  return (
    <Card 
      title={title}
      bordered={false}
      style={{
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
      }}
    >
      <Table
        columns={antColumns}
        dataSource={data.map((item, index) => ({ ...item, key: index }))}
        pagination={{ pageSize: 10 }}
        bordered={false}
        size="middle"
        onRow={onRowClick ? (record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' }
        }) : undefined}
      />
    </Card>
  )
}

const StatusBadge: React.FC<{ status: "Enabled" | "Disabled"; type: "mfa" }> = ({ status }) => {
  const isEnabled = status === "Enabled"
  return (
    <Badge 
      color={isEnabled ? "green" : "red"} 
      text={status}
    />
  )
}

const RiskBadge: React.FC<{ level: "High" | "Medium" | "Low" }> = ({ level }) => {
  const colorMap = {
    High: "red",
    Medium: "orange",
    Low: "green",
  }
  return (
    <Badge 
      color={colorMap[level]} 
      text={level}
    />
  )
}

export { ReportCard, LineChartComponent, BarChartComponent, PieChartComponent, TableComponent, StatusBadge, RiskBadge }
