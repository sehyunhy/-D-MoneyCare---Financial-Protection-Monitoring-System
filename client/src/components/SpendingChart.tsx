import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SpendingChartProps {
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  analytics?: {
    avgDailySpending: number;
    anomalyCount: number;
    preventedLoss: number;
  };
}

export default function SpendingChart({ timeframe, onTimeframeChange, analytics }: SpendingChartProps) {
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const firstPatientId = Array.isArray(patients) && patients.length > 0 ? patients[0].id : null;
  
  const { data: spendingData = [] } = useQuery({
    queryKey: [`/api/patients/${firstPatientId}/spending-trends`, { days: parseInt(timeframe) }],
    enabled: !!firstPatientId,
  });

  // Transform data for chart
  const chartData = Array.isArray(spendingData) ? spendingData.map((item: any, index: number) => ({
    name: new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    amount: Number(item.amount) || 0,
    isAnomaly: item.isAnomaly,
    average: analytics?.avgDailySpending || 85000,
  })) : [];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-900">지출 패턴 분석</CardTitle>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">최근 7일</SelectItem>
              <SelectItem value="30">최근 30일</SelectItem>
              <SelectItem value="90">최근 3개월</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number) => [`₩${value.toLocaleString()}`, "지출액"]}
                labelFormatter={(label) => `요일: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="일일 지출"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill={payload.isAnomaly ? "#ef4444" : "#3b82f6"}
                      key={`${cx}-${cy}`}
                    />
                  );
                }}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#3b82f6" 
                strokeDasharray="5 5"
                name="평균 지출"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-neutral-600">평균 일일 지출</p>
            <p className="text-lg font-semibold text-neutral-900">
              ₩{analytics?.avgDailySpending?.toLocaleString() || "145,000"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">이상 거래 감지</p>
            <p className="text-lg font-semibold text-danger">
              {analytics?.anomalyCount || 12}건
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">예방한 손실</p>
            <p className="text-lg font-semibold text-success">
              ₩{analytics?.preventedLoss?.toLocaleString() || "2,340,000"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
