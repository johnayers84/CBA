import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import QRCodeLib from 'qrcode';
import { getEvent } from '../../lib/services/events.service';
import { getTablesWithSeats, createTableWithSeats, deleteTable } from '../../lib/services/tables.service';
import type { Event, TableWithSeats, Seat } from '../../types';
import './AdminPages.css';
import './EventTables.css';

export function EventTables() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableWithSeats | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);

    const [eventRes, tablesRes] = await Promise.all([
      getEvent(id),
      getTablesWithSeats(id),
    ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (tablesRes.data) setTables(tablesRes.data);
    if (eventRes.error) setError(eventRes.error);

    setIsLoading(false);
  };

  const handleAddTable = async (tableNumber: number, name: string, seatCount: number) => {
    if (!id) return;
    const response = await createTableWithSeats(id, { tableNumber, name, seatCount });
    if (response.data) {
      setTables([...tables, response.data]);
      setShowAddModal(false);
    } else {
      setError(response.error || 'Failed to create table');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Delete this table and all its seats? This cannot be undone.')) return;
    const response = await deleteTable(tableId);
    if (!response.error) {
      setTables(tables.filter((t) => t.id !== tableId));
    }
  };

  const showQR = (table: TableWithSeats) => {
    setSelectedTable(table);
    setShowQRModal(true);
  };

  if (isLoading) {
    return <div className="admin-page loading">Loading tables...</div>;
  }

  if (!event) {
    return (
      <div className="admin-page">
        <div className="error-banner">{error || 'Event not found'}</div>
        <Link to="/admin/events">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="admin-page event-tables">
      <Link to={`/admin/events/${id}`} className="back-link">
        ← Back to {event.name}
      </Link>

      <div className="page-header">
        <h1>Judge Tables - {event.name}</h1>
        <button className="primary-button" onClick={() => setShowAddModal(true)}>
          Add Table
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {tables.length === 0 ? (
        <div className="empty-state">
          <p>No tables configured yet. Add your first judge table to get started.</p>
        </div>
      ) : (
        <div className="tables-list">
          {tables
            .sort((a, b) => a.tableNumber - b.tableNumber)
            .map((table) => (
              <div key={table.id} className="table-card-large">
                <div className="table-header">
                  <div className="table-title">
                    <h3>Table {table.tableNumber}</h3>
                    <span className="table-name">{table.name || `Judge Table ${table.tableNumber}`}</span>
                  </div>
                  <div className="table-actions">
                    <button className="secondary-button" onClick={() => showQR(table)}>
                      View QR Code
                    </button>
                    <button
                      className="danger-button small"
                      onClick={() => handleDeleteTable(table.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="seats-section">
                  <h4>Seats ({table.seats.length})</h4>
                  <div className="seats-grid">
                    {table.seats
                      .sort((a, b) => a.seatNumber - b.seatNumber)
                      .map((seat) => (
                        <SeatCard key={seat.id} seat={seat} tableNumber={table.tableNumber} />
                      ))}
                    {table.seats.length === 0 && (
                      <p className="no-seats">No seats configured</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="bulk-actions">
        <button className="secondary-button" onClick={() => window.print()}>
          Print All QR Codes
        </button>
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <AddTableModal
          existingNumbers={tables.map((t) => t.tableNumber)}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTable}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTable && (
        <QRCodeModal
          table={selectedTable}
          eventId={id || ''}
          eventName={event.name}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTable(null);
          }}
        />
      )}

      {/* Print-only section */}
      <div className="print-only">
        <h2>{event.name} - Judge Table QR Codes</h2>
        <div className="qr-grid">
          {tables
            .sort((a, b) => a.tableNumber - b.tableNumber)
            .flatMap((table) =>
              table.seats.map((seat) => (
                <div key={seat.id} className="qr-card">
                  <div className="qr-table-info">Table {table.tableNumber} - Seat {seat.seatNumber}</div>
                  <div className="qr-visual">
                    <QRCode seatId={seat.id} eventId={id || ''} />
                  </div>
                  <div className="qr-label">{table.name || `Judge Table ${table.tableNumber}`}</div>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
}

function SeatCard({ seat, tableNumber }: { seat: Seat; tableNumber: number }) {
  return (
    <div className="seat-card">
      <span className="seat-number">Seat {seat.seatNumber}</span>
      <span className="seat-qr-hint">QR: T{tableNumber}S{seat.seatNumber}</span>
    </div>
  );
}

function AddTableModal({
  existingNumbers,
  onClose,
  onSave,
}: {
  existingNumbers: number[];
  onClose: () => void;
  onSave: (tableNumber: number, name: string, seatCount: number) => void;
}) {
  const nextNumber = Math.max(0, ...existingNumbers) + 1;
  const [tableNumber, setTableNumber] = useState(nextNumber);
  const [name, setName] = useState('');
  const [seatCount, setSeatCount] = useState(6);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existingNumbers.includes(tableNumber)) {
      setError('Table number already exists');
      return;
    }
    onSave(tableNumber, name.trim(), seatCount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Judge Table</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="tableNumber">Table Number</label>
            <input
              type="number"
              id="tableNumber"
              value={tableNumber}
              onChange={(e) => setTableNumber(Number(e.target.value))}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Table Name (optional)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Stage"
            />
          </div>

          <div className="form-group">
            <label htmlFor="seatCount">Number of Seats</label>
            <input
              type="number"
              id="seatCount"
              value={seatCount}
              onChange={(e) => setSeatCount(Number(e.target.value))}
              min="1"
              max="20"
            />
            <p className="form-hint">
              Seats will be automatically created and numbered 1 through {seatCount}.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Add Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QRCodeModal({
  table,
  eventId,
  eventName,
  onClose,
}: {
  table: TableWithSeats;
  eventId: string;
  eventName: string;
  onClose: () => void;
}) {
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(
    table.seats[0] || null
  );

  const printQRCode = async () => {
    if (!selectedSeat) return;

    const qrUrl = `${window.location.origin}/scan?seat=${selectedSeat.id}&event=${eventId}`;

    // Generate QR code data URL
    const qrDataUrl = await QRCodeLib.toDataURL(qrUrl, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Table ${table.tableNumber} Seat ${selectedSeat.seatNumber} QR Code</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .card {
              text-align: center;
              padding: 2rem;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .event-name { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
            .table-info { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
            .qr-image { width: 200px; height: 200px; margin: 1rem auto; }
            .scan-url { font-size: 0.75rem; color: #666; word-break: break-all; max-width: 250px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="event-name">${eventName}</div>
            <div class="table-info">Table ${table.tableNumber} - Seat ${selectedSeat.seatNumber}</div>
            <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
            <div class="scan-url">Scan to start judging</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Table {table.tableNumber} QR Codes</h2>

        {table.seats.length > 0 ? (
          <>
            <div className="seat-selector">
              <label>Select Seat:</label>
              <div className="seat-buttons">
                {table.seats
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map((seat) => (
                    <button
                      key={seat.id}
                      className={`seat-button ${selectedSeat?.id === seat.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSeat(seat)}
                    >
                      {seat.seatNumber}
                    </button>
                  ))}
              </div>
            </div>

            {selectedSeat && (
              <div className="qr-preview">
                <QRCode seatId={selectedSeat.id} eventId={eventId} />
                <p className="seat-info">Seat {selectedSeat.seatNumber}</p>
                <p className="scan-url">
                  {window.location.origin}/scan?seat={selectedSeat.id}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="no-seats-message">No seats configured for this table.</p>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={printQRCode}
            disabled={!selectedSeat}
          >
            Print QR Code
          </button>
        </div>
      </div>
    </div>
  );
}

function QRCode({ seatId, eventId, size = 150 }: { seatId: string; eventId: string; size?: number }) {
  const url = `${window.location.origin}/scan?seat=${seatId}&event=${eventId}`;

  return (
    <div className="qr-code-wrapper">
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        includeMargin={true}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
