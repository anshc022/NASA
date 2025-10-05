import ProfileScreenModern from '../../screens/ProfileScreenModern';
import { useRouter } from 'expo-router';

export default function Profile() {
  const router = useRouter();
  return <ProfileScreenModern navigation={router} />;
}
