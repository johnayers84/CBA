import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { post } from '../lib/api';
import type { AuthResponse, JudgeContext } from '../types';
import './ScanQR.css';

/**
 * QR Code scanner page for judge authentication.
 */
export function ScanQR() {
  const navigate = useNavigate();
  const { loginAsJudge } = useAuthStore();
  const [qrToken, setQrToken] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [tableInfo, setTableInfo] = useState<{
    tableId: string;
    tableNumber: number;
    eventId: string;
    seats: Array<{ id: string; seatNumber: number; isOccupied: boolean }>;
  } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Validate QR token and get table info
  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) {
      setError('Please enter the QR code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await post<{
        tableId: string;
        tableNumber: number;
        eventId: string;
        seats: Array<{ id: string; seatNumber: number; isOccupied: boolean }>;
      }>('/auth/validate-qr', { qrToken });

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setTableInfo(response.data);
      }
    } catch {
      setError('Failed to validate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select seat and authenticate
  const handleSeatSelect = async () => {
    if (!tableInfo || selectedSeat === null) return;

    const seat = tableInfo.seats.find(s => s.seatNumber === selectedSeat);
    if (!seat) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await post<AuthResponse>('/auth/seat-token', {
        seatId: seat.id,
        qrToken,
      });

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        const context: JudgeContext = {
          seatId: seat.id,
          tableId: tableInfo.tableId,
          eventId: tableInfo.eventId,
          seatNumber: seat.seatNumber,
          tableNumber: tableInfo.tableNumber,
        };
        loginAsJudge(response.data.accessToken, context);
        navigate('/judge');
      }
    } catch {
      setError('Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-card">
        <h1>Judge Sign In</h1>

        {!tableInfo ? (
          // Step 1: QR Code Entry
          <form onSubmit={handleQRSubmit}>
            <div className="scan-instructions">
              <p>Scan the QR code on your table or enter the code manually.</p>
            </div>

            <div className="form-group">
              <label htmlFor="qrToken">Table Code</label>
              <input
                type="text"
                id="qrToken"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Enter table QR code"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || !qrToken.trim()}
            >
              {isLoading ? 'Validating...' : 'Continue'}
            </button>
          </form>
        ) : (
          // Step 2: Seat Selection
          <div className="seat-selection">
            <div className="table-info">
              <h2>Table {tableInfo.tableNumber}</h2>
              <p>Select your seat</p>
            </div>

            <div className="seat-grid">
              {tableInfo.seats.map((seat) => (
                <button
                  key={seat.id}
                  className={`seat-button ${
                    seat.isOccupied ? 'occupied' : ''
                  } ${selectedSeat === seat.seatNumber ? 'selected' : ''}`}
                  onClick={() => !seat.isOccupied && setSelectedSeat(seat.seatNumber)}
                  disabled={seat.isOccupied}
                >
                  <span className="seat-number">{seat.seatNumber}</span>
                  {seat.isOccupied && <span className="seat-status">Taken</span>}
                </button>
              ))}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="seat-actions">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setTableInfo(null);
                  setSelectedSeat(null);
                  setError('');
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleSeatSelect}
                disabled={isLoading || selectedSeat === null}
              >
                {isLoading ? 'Signing In...' : 'Confirm Seat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
