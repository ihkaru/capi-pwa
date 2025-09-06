export function getBackgroundColorForStatus(status: string | null | undefined): string {
  if (status === 'Submitted by PPL') return '#bbdefb'; // Light Blue
  if (status === 'Approved by PML' || status === 'Approved by Admin') return '#c8e6c9'; // Light Green
  if (status === 'Rejected by PML' || status === 'Rejected by Admin') return '#ffcdd2'; // Light Red
  if (status === 'Opened') return '#ffffff'; // White for Opened
  return '#f0f0f0'; // Very Light Gray for 'Assigned' or null/undefined
}

export function getBadgeColorForStatus(status: string | null | undefined): string {
  if (status === 'Submitted by PPL') return 'blue';
  if (status === 'Approved by PML' || status === 'Approved by Admin') return 'green';
  if (status === 'Rejected by PML' || status === 'Rejected by Admin') return 'red';
  if (status === 'Opened') return 'gray'; // Gray for Opened
  return 'yellow'; // For 'Assigned' or null/undefined
}