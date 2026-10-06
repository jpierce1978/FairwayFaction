import { PlaceholderScreen } from '@/screens/PlaceholderScreen';

export default function FactionHomeRoute() {
  return (
    <PlaceholderScreen
      topInset={false}
      title="Faction Home"
      description="The operational home for a persistent group."
      planned={[
        "Next round + RSVP (I'm In / Can't Play)",
        'Standings preview',
        'Recent round',
        'Manage (admins)',
      ]}
    />
  );
}
