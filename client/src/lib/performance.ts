// Performance optimization utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  measureLatency(operation: string, startTime: number): void {
    const latency = performance.now() - startTime;
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(latency);
    
    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }
    
    console.log(`${operation} latency: ${latency.toFixed(2)}ms`);
  }

  getAverageLatency(operation: string): number {
    const operationMetrics = this.metrics.get(operation);
    if (!operationMetrics || operationMetrics.length === 0) return 0;
    
    const sum = operationMetrics.reduce((a, b) => a + b, 0);
    return sum / operationMetrics.length;
  }

  getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    
    Array.from(this.metrics.entries()).forEach(([operation, measurements]) => {
      result[operation] = {
        average: this.getAverageLatency(operation),
        count: measurements.length
      };
    });
    
    return result;
  }
}

// Debounce utility for reducing unnecessary calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Connection quality assessment
export class ConnectionQuality {
  private static instance: ConnectionQuality;
  private qualityMetrics = {
    rtt: 0,
    packetLoss: 0,
    jitter: 0,
    bandwidth: 0
  };

  static getInstance(): ConnectionQuality {
    if (!ConnectionQuality.instance) {
      ConnectionQuality.instance = new ConnectionQuality();
    }
    return ConnectionQuality.instance;
  }

  async assessConnection(peerConnection: RTCPeerConnection): Promise<void> {
    try {
      const stats = await peerConnection.getStats();
      
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          this.qualityMetrics.rtt = report.currentRoundTripTime * 1000 || 0;
        }
        
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          this.qualityMetrics.packetLoss = report.packetsLost || 0;
          this.qualityMetrics.jitter = report.jitter || 0;
        }
        
        if (report.type === 'candidate-pair' && report.availableOutgoingBitrate) {
          this.qualityMetrics.bandwidth = report.availableOutgoingBitrate / 1000; // Convert to kbps
        }
      });
      
      console.log('Connection quality:', this.qualityMetrics);
    } catch (error) {
      console.error('Error assessing connection quality:', error);
    }
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { rtt, packetLoss } = this.qualityMetrics;
    
    if (rtt < 50 && packetLoss < 0.01) return 'excellent';
    if (rtt < 100 && packetLoss < 0.02) return 'good';
    if (rtt < 200 && packetLoss < 0.05) return 'fair';
    return 'poor';
  }

  getMetrics() {
    return { ...this.qualityMetrics };
  }
}

// Memory management for video streams
export class StreamManager {
  private static activeStreams = new Set<MediaStream>();

  static addStream(stream: MediaStream): void {
    this.activeStreams.add(stream);
  }

  static removeStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
    this.activeStreams.delete(stream);
  }

  static cleanup(): void {
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.activeStreams.clear();
  }

  static getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}