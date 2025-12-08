import React from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const ErrorContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #0D0F18;
  color: #A4ACBC;
  padding: 2rem;
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  color: #ff4d4d;
  margin-bottom: 1.5rem;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: white;
  margin-bottom: 1rem;
`;

const Message = styled.p`
  max-width: 600px;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const RetryButton = styled.button`
  background: #39FF14;
  color: black;
  border: none;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(57, 255, 20, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorContainer>
                    <ErrorIcon>
                        <FaExclamationTriangle />
                    </ErrorIcon>
                    <Title>Something went wrong</Title>
                    <Message>
                        We encountered an unexpected error ensuring your career path.
                        Our engineers have been notified. Please try refreshing the page.
                    </Message>
                    <RetryButton onClick={this.handleRetry}>
                        <FaRedo /> Refresh Page
                    </RetryButton>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div style={{ marginTop: '2rem', textAlign: 'left', background: '#1F2330', padding: '1rem', borderRadius: '8px', overflow: 'auto', maxWidth: '800px', width: '100%' }}>
                            <code style={{ color: '#ff4d4d' }}>{this.state.error.toString()}</code>
                            <br />
                            <code style={{ color: '#A4ACBC', fontSize: '0.8rem' }}>{this.state.errorInfo?.componentStack}</code>
                        </div>
                    )}
                </ErrorContainer>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
