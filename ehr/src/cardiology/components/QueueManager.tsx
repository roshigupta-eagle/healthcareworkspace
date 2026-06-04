'use client';

/**
 * Queue Manager
 *
 * Comprehensive work queue interface for all 13 cardiology queues.
 * Allows staff to:
 * - View queue items sorted by priority
 * - Claim items (assign to self)
 * - Mark items complete
 * - Filter and search
 * - Track SLA metrics
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/design-system/utils/cn';
import {
  DataTable,
  Card,
  Badge,
  Button,
  FormField,
  Input,
  Alert,
  Modal,
  Text,
} from '@/design-system';
import { QueueItem, QueueName, QueueItemStatus, VisitPriority, CardiologyRole } from '../types/fhir-domain';

interface QueueManagerProps {
  /**
   * All queue items (typically filtered by queue name by parent)
   */
  items: QueueItem[];

  /**
   * Current user's role (for ownership/claim validation)
   */
  currentUserRole: CardiologyRole;
  currentUserId: string;
  currentUserName: string;

  /**
   * Called when user claims an item
   */
  onClaimItem?: (itemId: string, userId: string) => void;

  /**
   * Called when user marks item complete
   */
  onCompleteItem?: (itemId: string, notes?: string) => void;

  /**
   * Called when user wants to view the associated visit detail
   */
  onViewVisit?: (visitId: string) => void;

  /**
   * Filter to specific queue(s)
   */
  queueFilter?: QueueName | QueueName[];

  /**
   * Filter to specific status(es)
   */
  statusFilter?: QueueItemStatus | QueueItemStatus[];

  className?: string;
}

const priorityOrder: Record<VisitPriority, number> = {
  [VisitPriority.URGENT]: 0,
  [VisitPriority.HIGH]: 1,
  [VisitPriority.NORMAL]: 2,
  [VisitPriority.LOW]: 3,
};

const priorityLabels: Record<VisitPriority, string> = {
  [VisitPriority.URGENT]: 'URGENT',
  [VisitPriority.HIGH]: 'HIGH',
  [VisitPriority.NORMAL]: 'NORMAL',
  [VisitPriority.LOW]: 'LOW',
};

const priorityVariants: Record<
  VisitPriority,
  'critical' | 'warning' | 'info' | 'neutral'
> = {
  [VisitPriority.URGENT]: 'critical',
  [VisitPriority.HIGH]: 'warning',
  [VisitPriority.NORMAL]: 'info',
  [VisitPriority.LOW]: 'neutral',
};

export const QueueManager: React.FC<QueueManagerProps> = ({
  items,
  currentUserRole,
  currentUserId,
  currentUserName,
  onClaimItem,
  onCompleteItem,
  onViewVisit,
  queueFilter,
  statusFilter,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<QueueItemStatus>(QueueItemStatus.PENDING);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Queue filter
        if (queueFilter) {
          const queues = Array.isArray(queueFilter) ? queueFilter : [queueFilter];
          if (!queues.includes(item.queueName)) return false;
        }

        // Status filter
        if (statusFilter) {
          const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
          if (!statuses.includes(item.status)) return false;
        }

        // Active tab filter
        if (item.status !== activeStatus) return false;

        // Search filter
        if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          return (
            item.patientName.toLowerCase().includes(lower) ||
            item.queueName.toLowerCase().includes(lower) ||
            item.visitId.toLowerCase().includes(lower)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by age (oldest first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [items, queueFilter, statusFilter, activeStatus, searchTerm]);

  const handleClaimItem = (item: QueueItem) => {
    onClaimItem?.(item.id, currentUserId);
  };

  const handleOpenComplete = (item: QueueItem) => {
    setSelectedItem(item);
    setCompleteNotes('');
    setCompleteModalOpen(true);
  };

  const handleSubmitComplete = () => {
    if (selectedItem) {
      onCompleteItem?.(selectedItem.id, completeNotes.trim() || undefined);
      setCompleteModalOpen(false);
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const pending = filteredItems.filter((i) => i.status === 'PENDING');
    const inProgress = filteredItems.filter((i) => i.status === 'IN_PROGRESS');
    const completed = filteredItems.filter((i) => i.status === 'COMPLETED');

    const avgWaitPending =
      pending.length > 0
        ? Math.round(
            pending.reduce(
              (sum, item) =>
                sum +
                (Date.now() - new Date(item.createdAt).getTime()) / 1000 / 60,
              0,
            ) / pending.length,
          )
        : 0;

    return { pending: pending.length, inProgress: inProgress.length, completed: completed.length, avgWaitPending };
  }, [filteredItems]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Work Queues</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Manage patient workflow items across all cardiology roles.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <FormField label="Search" className="flex-1">
          <Input
            placeholder="Search by patient name, queue, or visit ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FormField>

        <div className="flex gap-2">
          {[QueueItemStatus.PENDING, QueueItemStatus.IN_PROGRESS, QueueItemStatus.COMPLETED].map((status) => (
            <Button
              key={status}
              variant={activeStatus === status ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveStatus(status)}
            >
              {status.replace(/_/g, ' ')} ({filteredItems.filter((i) => i.status === status).length})
            </Button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      {activeStatus === QueueItemStatus.PENDING && (
        <div className="grid grid-cols-3 gap-3">
          <Card variant="outlined" className="p-3">
            <Text variant="caption" className="text-neutral-600 uppercase block">
              Pending
            </Text>
            <Text variant="heading4" className="text-primary-600 mt-1">
              {stats.pending}
            </Text>
          </Card>
          <Card variant="outlined" className="p-3">
            <Text variant="caption" className="text-neutral-600 uppercase block">
              Avg Wait
            </Text>
            <Text variant="heading4" className="text-warning-600 mt-1">
              {stats.avgWaitPending}m
            </Text>
          </Card>
          <Card variant="outlined" className="p-3">
            <Text variant="caption" className="text-neutral-600 uppercase block">
              In Progress
            </Text>
            <Text variant="heading4" className="text-info-600 mt-1">
              {stats.inProgress}
            </Text>
          </Card>
        </div>
      )}

      {/* Queue Items List */}
      {filteredItems.length === 0 ? (
        <Alert severity="info">
          No items found {searchTerm && `matching "${searchTerm}"`}. Check back soon!
        </Alert>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const ageMinutes = Math.round((Date.now() - new Date(item.createdAt).getTime()) / 1000 / 60);
            const isOwnItem = item.claimedBy === currentUserId;
            const isClaimed = item.status === 'IN_PROGRESS' && !!item.claimedBy;

            return (
              <Card
                key={item.id}
                variant="outlined"
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  isOwnItem ? 'bg-primary-50 border-2 border-primary-200 shadow-md' : ''
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  {/* Patient & Queue Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text variant="body" className="font-semibold text-neutral-900">
                        {item.patientName}
                      </Text>
                      <Badge variant={priorityVariants[item.priority]} size="sm">
                        {priorityLabels[item.priority]}
                      </Badge>
                      {isOwnItem && (
                        <Badge variant="info" size="sm">
                          ← Your Item
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-neutral-600">
                      <span>{item.queueName}</span>
                      <span>•</span>
                      <span>{ageMinutes} min ago</span>
                      {isClaimed && (
                        <>
                          <span>•</span>
                          <span className="text-neutral-700 font-medium">
                            Claimed by {item.claimedBy === currentUserId ? 'you' : 'someone else'}
                          </span>
                        </>
                      )}
                    </div>

                    {item.notes && (
                      <Text variant="body-sm" className="mt-2 text-neutral-700 italic">
                        "{item.notes}"
                      </Text>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                    {activeStatus === QueueItemStatus.PENDING && !isClaimed && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleClaimItem(item)}
                      >
                        Claim for Me
                      </Button>
                    )}

                    {activeStatus === QueueItemStatus.IN_PROGRESS && isOwnItem && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenComplete(item)}
                      >
                        Mark Complete
                      </Button>
                    )}

                    {activeStatus === QueueItemStatus.IN_PROGRESS && !isOwnItem && isClaimed && (
                      <Button variant="ghost" size="sm" disabled>
                        {item.claimedBy ? '⏳ In Progress' : 'Unclaimed'}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewVisit?.(item.visitId)}
                    >
                      View Visit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Complete Item Modal */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Queue Item"
        description={`Patient: ${selectedItem?.patientName}`}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitComplete}>
              Mark Complete
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Completion Notes (optional)"
            hint="Document any relevant information"
          >
            <textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Vitals recorded, patient roomed, awaiting physician"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none"
            />
          </FormField>

          <Alert severity="info">
            ✓ Item will be marked complete and moved out of your queue.
          </Alert>
        </div>
      </Modal>
    </div>
  );
};
