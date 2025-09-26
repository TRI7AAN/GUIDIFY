import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import styled from 'styled-components';

const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  color: var(--emerald-neon);
  margin-bottom: 1rem;
  text-align: center;
`;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '10px',
                border: '1px solid #39FF14',
                borderRadius: '8px',
                color: '#fff'
            }}>
                <p>{`${label} : ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

const SkillsRadar = ({ data }) => {
    const chartData = data ? [
        { subject: 'Technical', A: data.Technical || data.technical || 0, fullMark: 100 },
        { subject: 'Creative', A: data.Creative || data.creative || 0, fullMark: 100 },
        { subject: 'Communication', A: data.Social || data.social || data.Communication || data.communication || 0, fullMark: 100 },
        { subject: 'Leadership', A: data.Leadership || data.leadership || 0, fullMark: 100 },
        { subject: 'Analytical', A: data.Analytical || data.analytical || 0, fullMark: 100 },
    ] : [];

    return (
        <ChartContainer>
            <Title>Personality Profile</Title>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="85%" data={chartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="You"
                        dataKey="A"
                        stroke="#39FF14"
                        strokeWidth={3}
                        fill="#39FF14"
                        fillOpacity={0.3}
                    />
                    <Tooltip content={<CustomTooltip />} />
                </RadarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default SkillsRadar;
