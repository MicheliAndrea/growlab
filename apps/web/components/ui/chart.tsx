"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  time: string;
  value: number;
};

type NamedChartPoint = {
  name: string;
  value: number;
};

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--card-foreground))",
  fontSize: 12,
};

export function MiniLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer height={120} width="100%">
      <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          dataKey="value"
          dot={false}
          isAnimationActive={false}
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OperationsAreaChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer height={220} width="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="operationsFill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="hsl(var(--chart-1))"
              stopOpacity={0.38}
            />
            <stop
              offset="95%"
              stopColor="hsl(var(--chart-1))"
              stopOpacity={0.04}
            />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          axisLine={false}
          dataKey="time"
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          width={28}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          dataKey="value"
          fill="url(#operationsFill)"
          isAnimationActive={false}
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ResourceBarChart({ data }: { data: NamedChartPoint[] }) {
  return (
    <ResponsiveContainer height={220} width="100%">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          axisLine={false}
          dataKey="name"
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          width={28}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar dataKey="value" isAnimationActive={false} radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              fill={chartColors[index % chartColors.length]}
              key={entry.name}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: NamedChartPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
      <ResponsiveContainer height={180} width="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Pie
            cx="50%"
            cy="50%"
            data={total > 0 ? data : [{ name: "none", value: 1 }]}
            dataKey="value"
            innerRadius={52}
            isAnimationActive={false}
            nameKey="name"
            outerRadius={78}
            paddingAngle={2}
          >
            {(total > 0 ? data : [{ name: "none", value: 1 }]).map(
              (entry, index) => (
                <Cell
                  fill={
                    total > 0
                      ? chartColors[index % chartColors.length]
                      : "hsl(var(--muted))"
                  }
                  key={entry.name}
                />
              ),
            )}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="grid gap-2 text-sm">
        {data.map((item, index) => (
          <div
            className="flex items-center justify-between gap-3"
            key={item.name}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
              <span className="truncate text-muted-foreground">
                {item.name}
              </span>
            </span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
