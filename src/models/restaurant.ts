
export interface MenuItem {
  id: string;

  name: string;
  nameLower: string;

  description: string;
  category: string;

  price: number;

  stars?: number;
  review?: number;

  imageUrl: string;
}

export interface Restaurant {
  restaurantId: string;
  firebaseId: string;
  userId: string;

  restaurantName: string;
  restaurantNameLower: string;

  menuItemNamesLower: string[];

   address: {
    text: string;
    lat: number;
    lng: number;
  };

  city: string;
  cityLower: string;
  country: string;

  deliveryTimeMinutes: number;
  deliveryPrice: number;

  menuItem: MenuItem[];

  imageUrl: string;
  lastUpdated: FirebaseFirestore.Timestamp;
}

